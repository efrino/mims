<script setup lang="ts">
type Breadcrumb = {
  title: string;
  disabled: boolean;
  href: string;
  icon?: string;
};
const props = defineProps({
  title: String,
  breadcrumbs: Array as () => Breadcrumb[],
  icon: String
});
</script>

// ===============================|| Theme Breadcrumb ||=============================== //
<template>
  <div class="w-full mb-0">
    <div class="w-full">
      <div class="bg-transparent shadow-none">
        <div class="flex items-center">
          <div class="w-full">
            <h3 class="text-xl font-semibold mb-0 text-gray-600 dark:text-slate-100">{{ props.title }}</h3>
            <nav class="flex items-center text-sm font-medium mb-0">
              <router-link to="/" class="text-gray-600 no-underline hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"> Dashboard </router-link>
              <span class="flex items-center px-2">/</span>
              <template v-for="(item, index) in props.breadcrumbs" :key="index">
                <router-link v-if="!item.disabled && item.href" :to="item.href" class="text-gray-600 no-underline hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200">
                  {{ item.title }}
                </router-link>
                <span v-else class="text-[#1677ff] dark:text-blue-300 font-semibold">
                  {{ item.title }}
                </span>
                <span v-if="index < props.breadcrumbs?.length! - 1" class="flex items-center px-2">/</span>
              </template>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>