<script setup lang="ts">
// Wrapper reusable utk useAnimatedNumber - dipakai di mana pun butuh angka
// count-up/down (termasuk di dalam v-for, di mana composable tak bisa
// dipanggil langsung per-iterasi).
import { computed } from 'vue';
import { useAnimatedNumber } from '@/composables/useAnimatedNumber';

const props = withDefaults(defineProps<{ value: number; locale?: string }>(), {
  locale: 'id-ID'
});

const animated = useAnimatedNumber(computed(() => Number(props.value)));
</script>

<template>{{ animated.toLocaleString(locale) }}</template>
