<script setup lang="ts">
import { GlobalOutlined, NodeExpandOutlined } from '@ant-design/icons-vue';

const props = defineProps({
  title: String,
  subContent: String,
  path: String,
  link: String
});
</script>

// ===============================|| Component title ||=============================== //
<template>
  <div class="w-full mb-0 -mt-3">
    <div class="w-full">
      <div class="bg-transparent shadow-none">
        <div class="flex items-center">
          <div class="w-full">
            <h2 class="text-4xl font-bold mb-2">{{ props.title }}</h2>
            <h6 class="text-xl text-gray-600 mb-5">{{ props.subContent }}</h6>
            <div class="flex items-center mb-2 text-sm text-gray-600">
              <NodeExpandOutlined class="mr-2" />
              <span>{{ props.path }}</span>
            </div>
            <a :href="props.link" class="inline-flex items-center text-blue-600 text-sm hover:text-blue-800 hover:underline" target="_blank">
              <GlobalOutlined class="mr-2" />
              <span>{{ props.link }}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
