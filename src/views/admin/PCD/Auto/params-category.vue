<!-- views/admin/PCD/Auto/params-category.vue
     PCD › Auto › Params GLC Welding / Params GLC Press (2026-09-25) — nilai DEFAULT yang
     dipakai saat membuat periode GLC Welding / simulasi GLC Press baru. Satu halaman
     generik; grup planning_config, judul & catatan dari route meta:
       meta.paramsCategory, meta.paramsSubtitle, meta.paramsNote -->
<template>
  <div class="page-root">
    <header class="header-bar">
      <div class="header-title">
        <div class="header-icon"><i class="mdi" :class="route.meta.icon || 'mdi-tune'"></i></div>
        <div>
          <h1>{{ route.meta.title }}</h1>
          <p>{{ route.meta.paramsSubtitle }}</p>
        </div>
      </div>
    </header>
    <div class="body-scroll">
      <PlanningParamsPanel :key="category" :categories="[category]" :note="String(route.meta.paramsNote ?? '')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PlanningParamsPanel from '@/components/welding/params/PlanningParamsPanel.vue'

const route = useRoute()
const category = computed(() => String(route.meta.paramsCategory ?? ''))
</script>

<style scoped>
.page-root {
  position: fixed;
  top: var(--v-layout-top, 0px);
  left: var(--v-layout-left, 0px);
  right: 0;
  bottom: var(--v-layout-bottom, 0px);
  z-index: 1;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
  overflow: hidden;
}
.header-bar { display: flex; align-items: center; padding: 10px 16px; background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
.header-title { display: flex; align-items: center; gap: 10px; }
.header-icon { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 17px; }
.header-title h1 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0; line-height: 1.2; }
.header-title p { font-size: 11px; color: #94a3b8; margin: 2px 0 0; }
.body-scroll { flex: 1; overflow-y: auto; padding: 16px; }
</style>
