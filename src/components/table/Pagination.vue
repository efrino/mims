<script setup>
import { computed } from 'vue'

const props = defineProps({
  totalItems: { type: Number, required: true },
  itemsPerPage: { type: Number, default: 10 },
  currentPage: { type: Number, default: 1 },
  perPageOptions: {
    type: Array,
    default: () => [5, 10, 25, 50]
  }
})

const emit = defineEmits([
  'update:currentPage',
  'update:itemsPerPage'
])

const totalPages = computed(() =>
  Math.ceil(props.totalItems / props.itemsPerPage)
)

const pages = computed(() => {
  const maxVisible = 5
  const half = Math.floor(maxVisible / 2)

  let start = props.currentPage - half
  let end = props.currentPage + half

  if (start < 1) {
    start = 1
    end = maxVisible
  }

  if (end > totalPages.value) {
    end = totalPages.value
    start = totalPages.value - maxVisible + 1
  }

  const range = []
  for (let i = start; i <= end; i++) {
    if (i > 0 && i <= totalPages.value) {
      range.push(i)
    }
  }

  return range
})

const changePage = (page) => {
  if (page < 1 || page > totalPages.value) return
  emit('update:currentPage', page)
}

const goToFirst = () => {
  emit('update:currentPage', 1)
}

const goToLast = () => {
  emit('update:currentPage', totalPages.value)
}

const changePerPage = (value) => {
  emit('update:itemsPerPage', Number(value))
  emit('update:currentPage', 1)
}
</script>

<template>
  <div class="flex flex-col md:flex-row items-center justify-between gap-3 px-8 py-3.5">

    <!-- Info -->
    <div class="text-xs text-gray-600 flex items-center gap-2">
      Showing
      {{ (currentPage - 1) * itemsPerPage + 1 }}
      -
      {{ Math.min(currentPage * itemsPerPage, totalItems) }}
      of {{ totalItems }}
      <slot name="info-extra" />
    </div>

    <!-- Pagination -->
    <div class="flex items-center gap-2 text-xs">

      <!-- First -->
      <button
        @click="goToFirst"
        :disabled="currentPage === 1"
        class="px-2 py-1 rounded bg-gray-200 disabled:opacity-50"
      >
        «
      </button>

      <!-- Prev -->
      <button
        @click="changePage(currentPage - 1)"
        :disabled="currentPage === 1"
        class="px-2 py-1 rounded bg-gray-200 disabled:opacity-50"
      >
        ‹
      </button>

      <!-- Pages -->
      <button
        v-for="page in pages"
        :key="page"
        @click="changePage(page)"
        :class="[
          'px-3 py-1 rounded',
          page === currentPage
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200'
        ]"
      >
        {{ page }}
      </button>

      <!-- Next -->
      <button
        @click="changePage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="px-2 py-1 rounded bg-gray-200 disabled:opacity-50"
      >
        ›
      </button>

      <!-- Last -->
      <button
        @click="goToLast"
        :disabled="currentPage === totalPages"
        class="px-2 py-1 rounded bg-gray-200 disabled:opacity-50"
      >
        »
      </button>

    </div>

    <!-- Items per page -->
    <div class="flex items-center gap-2">
      <span class="text-xs">Rows:</span>
      <select
        :value="itemsPerPage"
        @change="changePerPage($event.target.value)"
        class="border rounded px-3 py-1 pr-6 text-xs"
      >
        <option
          v-for="opt in perPageOptions"
          :key="opt"
          :value="opt"
        >
          {{ opt }}
        </option>
      </select>
    </div>

  </div>
</template>