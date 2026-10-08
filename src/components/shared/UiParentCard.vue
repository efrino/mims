<script setup lang="ts">
const props = defineProps({
  title: String
});
</script>

// ===============================|| Ui Parent Card||=============================== //
<template>
  <div class="border border-gray-300 rounded-xl bg-white shadow-md">
    <div class="px-6 py-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h6 class="text-xl font-medium leading-[1.57]">{{ props.title }}</h6>
        <slot name="action"></slot>
      </div>
    </div>
    <hr class="border-gray-200" />
    <div class="px-6 py-4">
      <slot />
    </div>
  </div>
</template>
