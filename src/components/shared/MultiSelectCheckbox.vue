<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";

const props = defineProps<{
  modelValue: string[]
  options: string[]
  placeholder?: string
  keepSearch?: boolean
}>()

const emit = defineEmits(["update:modelValue"])

const open = ref(false)
const localValue = ref<string[]>([])

watch(
  () => props.modelValue,
  (v) => {
    localValue.value = Array.isArray(v) ? [...v] : []
  },
  { immediate: true }
)

// Search: ketikan di input dipakai untuk memfilter options
const search = ref("")

const filteredOptions = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter((item) => item.toLowerCase().includes(q))
})

const searchInputRef = ref<HTMLInputElement | null>(null)

const onInput = (e: Event) => {
  open.value = true
  search.value = (e.target as HTMLInputElement).value
}

const openAndFocus = () => {
  open.value = true
  searchInputRef.value?.focus()
}

const stopSearch = () => {
  search.value = ""
}


const toggleItem = (item: string) => {
  const idx = localValue.value.indexOf(item)

  if (idx === -1) {
    localValue.value.push(item)
  } else {
    localValue.value.splice(idx, 1)
  }

  emit("update:modelValue", [...localValue.value])

  // Setelah memilih, bersihkan kata kunci agar bisa langsung search lagi
  // dan menambah pilihan berikutnya (dropdown tetap terbuka).
  // Jika keepSearch aktif, kata kunci dipertahankan agar hasil filter tetap tampil
  if (!props.keepSearch) stopSearch()
  searchInputRef.value?.focus()
}

const dropdownRef = ref<HTMLElement | null>(null)

const handleClickOutside = (e: MouseEvent) => {
  if (!dropdownRef.value) return
  if (!dropdownRef.value.contains(e.target as Node)) {
    open.value = false
    stopSearch()
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside)
})
</script>

<template>
  <div class="relative" ref="dropdownRef">
    <!-- Area input: badge pilihan terpilih + kotak search -->
    <div
      class="w-full border-2 border-blue-400 rounded px-2 py-1 pr-7 cursor-text bg-white flex flex-wrap items-center gap-1 min-h-[30px] relative"
      @click="openAndFocus"
    >
      <span
        v-for="item in localValue"
        :key="item"
        class="inline-flex items-center gap-1 font-bold bg-blue-100 text-blue-800 text-xs rounded px-1.5 py-0.5"
      >
        {{ item }}
        <button
          type="button"
          class="text-blue-500 hover:text-blue-800 leading-none"
          @click.stop="toggleItem(item)"
        >
          ×
        </button>
      </span>
      <input
        ref="searchInputRef"
        type="text"
        class="search-input flex-1 min-w-[60px] outline-none bg-transparent text-sm text-gray-900"
        :value="search"
        :placeholder="localValue.length ? '' : (placeholder ?? 'Select')"
        @input="onInput"
      />
      <svg
        class="w-3.5 h-3.5 text-blue-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none transition-transform"
        :class="{ 'rotate-180': open }"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>

    <div
      v-if="open"
      class="absolute z-20 bg-white border-2 border-blue-400 rounded shadow-lg mt-1 w-full max-h-40 overflow-auto"
    >
      <label
        v-for="item in filteredOptions"
        :key="item"
        class="flex items-center px-2 py-1 text-gray-900 hover:bg-gray-100 cursor-pointer"
      >
        <input
          type="checkbox"
          class="mr-2 border border-gray-400"
          :checked="localValue.includes(item)"
          @change="toggleItem(item)"
        />
        {{ item }}
      </label>
      <div v-if="filteredOptions.length === 0" class="px-2 py-1 text-gray-400 text-sm">
        Tidak ada hasil
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Kotak search di dalam area input — polos tanpa border/ring bawaan */
.search-input,
.search-input:focus {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  padding: 0 !important;
}
</style>