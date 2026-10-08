<script setup lang="ts">
const props = defineProps({
  title: String,
  className: String
});
</script>

<template>
  <div class="bg-transparent rounded-md shadow-none">
    <div class="pb-2 px-0 pt-0">
      <h5 class="text-2xl font-semibold">{{ props.title }}</h5>
    </div>
    <div class="border border-gray-300 rounded-md p-4" :class="props.className">
      <slot />
    </div>
  </div>
</template>
