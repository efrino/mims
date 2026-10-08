<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer
    class="w-full bg-white/90 dark:bg-slate-800/90 border-t-4 border-slate-200 dark:border-slate-700 backdrop-blur-sm
           shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
  >
    <div class="px-6 py-2 flex justify-end">
      <p class="text-sm font-medium tracking-wide text-slate-500">
        © IT DEPARTMENT {{ currentYear }}
      </p>
    </div>
  </footer>
</template>