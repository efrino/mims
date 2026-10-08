<script setup lang="ts">
import { computed } from 'vue';
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

const props = defineProps<{ content: string }>();

const markdown = new MarkdownIt({
  html: false,
  breaks: true
});

const sanitizedHtml = computed(() => DOMPurify.sanitize(markdown.render(props.content)));
</script>

<template>
  <div class="markdown-content" v-html="sanitizedHtml" />
</template>

<style scoped>
.markdown-content {
  white-space: normal;
}

.markdown-content :deep(p) {
  margin: 0;
}

.markdown-content :deep(p + p) {
  margin-top: 0.75em;
}

.markdown-content :deep(ul) {
  margin: 0.5em 0;
  padding-inline-start: 1.5em;
  list-style-type: disc;
}

.markdown-content :deep(ol) {
  margin: 0.5em 0;
  padding-inline-start: 1.5em;
  list-style-type: decimal;
}

.markdown-content :deep(li + li) {
  margin-top: 0.2em;
}
</style>
