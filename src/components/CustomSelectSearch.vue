<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

interface PartItem {
  part_number: string
  part_delivery?: string | null
  job_number: string
  type?: string | null
  qty_kbn?: string | null
  customer?: string | null
}

type ReturnType = 'object' | 'job_number' | 'part_number' | 'job_part' | 'custom';

const props = withDefaults(defineProps<{
  modelValue?: PartItem | string | null
  items: PartItem[]
  label: string
  requireType?: boolean
  returnType?: ReturnType
  customFormat?: (item: PartItem) => string 
}>(), {
  returnType: 'object'
});

const emit = defineEmits<{
  'update:modelValue': [value: PartItem | string | null]
  'change': [value: PartItem | any | string | null]
  'select': [item: PartItem]
}>();

const isOpen = ref(false);
const searchQuery = ref('');
const dropdownRef = ref<HTMLElement | null>(null);
const requireType = computed(() => props.requireType ?? false);

// ✅ NEW: ref for the trigger element to calculate position
const triggerRef = ref<HTMLElement | null>(null);

// ✅ NEW: dynamic style for the teleported dropdown
const dropdownStyle = ref({
  position: 'fixed' as const,
  top: '0px',
  left: '0px',
  width: '0px',
  zIndex: '9999',
});

const selectedItem = ref<PartItem | null>(null);

watch(() => props.modelValue, (val) => {
  if (val === null || val === undefined) {
    selectedItem.value = null;
    searchQuery.value = '';
    return;
  }

  if (typeof val === 'string') {
    const found = props.items.find(item => {
      switch (props.returnType) {
        case 'job_number':
          return item.job_number === val;
        case 'part_number':
          return item.part_number === val;
        case 'job_part':
          return `${item.job_number}-${item.part_number}` === val;
        default:
          return false;
      }
    });
    selectedItem.value = found || null;
  } else {
    selectedItem.value = val;
  }
}, { immediate: true });

const filteredItems = computed(() => {
  let data = props.items;

  if (requireType.value) {
    data = data.filter(item => item.type);
  }

  if (!searchQuery.value) return data;

  const query = searchQuery.value.toLowerCase();
  return data.filter(item => {
    const searchText = `${item.job_number} ${item.part_number} ${item.type ?? ''}`.toLowerCase();
    return searchText.includes(query);
  });
});

const displayText = computed(() => {
  if (!selectedItem.value) return '';

  if (props.returnType == 'part_number' || props.returnType == 'job_number') {
    return props.returnType == 'part_number' ? selectedItem.value.part_number : selectedItem.value.job_number;
  } else {
    return requireType.value
      ? `${selectedItem.value.job_number} - ${selectedItem.value.part_number} - ${selectedItem.value.type}`
      : `${selectedItem.value.job_number} - ${selectedItem.value.part_number}`;
  }
});

const convertItemToReturnValue = (item: PartItem): PartItem | string => {
  switch (props.returnType) {
    case 'job_number':
      return item.job_number;
    case 'part_number':
      return item.part_number;
    case 'job_part':
      return `${item.job_number}-${item.part_number}`;
    case 'custom':
      return props.customFormat ? props.customFormat(item) : item.job_number;
    case 'object':
    default:
      return item;
  }
};

const selectItem = (item: PartItem) => {
  selectedItem.value = item;
  
  const returnValue = convertItemToReturnValue(item);
  
  emit('update:modelValue', returnValue);
  emit('change', returnValue);
  emit('select', item);
  
  isOpen.value = false;
  searchQuery.value = '';
};

const clearSelection = () => {
  selectedItem.value = null;
  emit('update:modelValue', null);
  emit('change', null);
  searchQuery.value = '';
};

// ✅ NEW: calculate and apply position based on trigger element
const positionDropdown = () => {
  if (!triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    zIndex: '9999',
  };
};

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    searchQuery.value = '';
    positionDropdown(); // ✅ NEW: position before showing
  }
};

// ✅ UPDATED: also check the teleported dropdown element
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;
  const teleportEl = document.getElementById('custom-select-teleport');
  if (
    dropdownRef.value && !dropdownRef.value.contains(target) &&
    (!teleportEl || !teleportEl.contains(target))
  ) {
    isOpen.value = false;
  }
};

// ✅ NEW: reposition dropdown on scroll or resize while open
const handleScrollOrResize = () => {
  if (isOpen.value) positionDropdown();
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('scroll', handleScrollOrResize, true);
  window.addEventListener('resize', handleScrollOrResize);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('scroll', handleScrollOrResize, true);
  window.removeEventListener('resize', handleScrollOrResize);
});
</script>

<template>
  <div ref="dropdownRef" class="w-full">
    <label class="mb-2 text-sm font-medium text-gray-900">
      {{ label }}
    </label>
    
    <div class="relative mt-1">
      <!-- ✅ UPDATED: added ref="triggerRef" -->
      <div 
        ref="triggerRef"
        @click="toggleDropdown"
        class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 w-full p-2.5 cursor-pointer flex items-center justify-between"
        :class="{ 'ring-2 ring-blue-500 !border-blue-500': isOpen }"
      >
        <span v-if="selectedItem" class="truncate">{{ displayText }}</span>
        <span v-else class="text-gray-400">{{ label }}</span>
        
        <div class="flex items-center gap-2">
          <button
            v-if="selectedItem"
            @click.stop="clearSelection"
            type="button"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <svg 
            class="w-4 h-4 text-gray-400 transition-transform"
            :class="{ 'rotate-180': isOpen }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- ✅ UPDATED: wrapped in <Teleport to="body"> with fixed positioning -->
      <Teleport to="body">
        <div
          v-show="isOpen"
          id="custom-select-teleport"
          :style="dropdownStyle"
          class="bg-white !border !border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden"
        >
          <!-- Search Input -->
          <div class="p-2 !border-b !border-gray-200">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search..."
              class="w-full px-3 py-2 text-sm !border !border-gray-300 rounded-lg focus:ring-blue-500 focus:!border-blue-500"
              @click.stop
            />
          </div>

          <!-- Items List -->
          <div class="overflow-y-auto max-h-64 flex flex-col">
            <div
              v-if="filteredItems.length === 0"
              class="px-4 py-3 text-sm text-gray-500 text-center"
            >
              {{ requireType ? 'Pilih tipe terlebih dulu' : 'Data tidak ditemukan' }}
            </div>
            
            <button
              v-for="(item, index) in filteredItems"
              :key="index"
              type="button"
              @click="selectItem(item)"
              class="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors !border-b !border-gray-100 last:!border-b-0"
              :class="{
                'bg-blue-100 font-medium': selectedItem && 
                  selectedItem.part_number === item.part_number && 
                  selectedItem.job_number === item.job_number
              }"
            >
              <div class="flex flex-col">
                <span class="font-medium text-gray-700">
                  <strong>{{ item.job_number }}</strong> - {{ item.part_number }}
                </span>
                <span class="text-xs text-gray-500">{{ item.type ?? '' }}</span>
              </div>
            </button>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for dropdown */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 10px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>