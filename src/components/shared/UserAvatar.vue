<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getUserPhotoUrl } from '@/services/ProfileService';

const props = defineProps<{
  username?: string;
  version?: number;
}>();

const hasError = ref(false);

const photoUrl = computed(() => (props.username ? getUserPhotoUrl(props.username, props.version) : ''));

watch(photoUrl, () => {
  hasError.value = false;
});
</script>

<template>
  <img v-if="photoUrl && !hasError" :src="photoUrl" alt="Photo" class="w-full h-full object-cover" @error="hasError = true" />
  <slot v-else />
</template>
