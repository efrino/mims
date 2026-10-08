<template>
  <!-- WipStockCard.vue: Kartu monitoring stok WIP per area -->
  <v-card class="wip-stock-card" :class="`border-${statusColor}`" rounded="lg" border>
    <v-card-text class="pa-4">

      <!-- Header: Part number + status chip -->
      <div class="d-flex align-start justify-space-between mb-2">
        <div class="flex-1 mr-2">
          <div class="text-subtitle-2 font-weight-bold text-truncate">
            {{ item.part_number }}
          </div>
          <div class="text-caption text-medium-emphasis text-truncate">
            {{ item.part_name ?? '—' }}
          </div>
        </div>
        <v-chip
          :color="statusColor"
          size="x-small"
          label
          class="flex-shrink-0"
        >
          {{ STOCK_STATUS_LABEL[item.stock_status] }}
        </v-chip>
      </div>

      <!-- Info: parent FP + area -->
      <div class="d-flex align-center gap-1 mb-3">
        <v-icon size="12" color="medium-emphasis">mdi-arrow-up-thin</v-icon>
        <span class="text-caption text-medium-emphasis">FP: </span>
        <span class="text-caption font-weight-medium">{{ item.parent_part }}</span>
        <v-icon size="10" class="ml-1" color="medium-emphasis">mdi-circle-small</v-icon>
        <span class="text-caption text-medium-emphasis">{{ item.area }}</span>
      </div>

      <!-- Stok gauge -->
      <div class="mb-3">
        <div class="d-flex justify-space-between mb-1">
          <span class="text-caption text-medium-emphasis">Stok saat ini</span>
          <span class="text-caption font-weight-bold">
            {{ item.stock_current.toLocaleString('id') }}
            <span class="text-medium-emphasis font-weight-regular">
              / SS {{ item.safety_min.toLocaleString('id') }}
            </span>
          </span>
        </div>
        <v-progress-linear
          :model-value="stockPercent"
          :color="statusColor"
          :max="100"
          height="6"
          rounded
          bg-color="surface-variant"
        />
        <div class="text-right mt-1">
          <span class="text-caption" :class="`text-${statusColor}`">
            {{ item.stock_pct }}
          </span>
        </div>
      </div>

      <!-- Detail row: BQ + OP + last TP -->
      <div class="d-flex justify-space-between">
        <div class="text-center">
          <div class="text-caption text-medium-emphasis">BQ</div>
          <div class="text-caption font-weight-bold">{{ item.bq }}</div>
        </div>
        <v-divider vertical class="mx-2" />
        <div class="text-center">
          <div class="text-caption text-medium-emphasis">OP</div>
          <div class="text-caption font-weight-bold">{{ item.op ?? '—' }}</div>
        </div>
        <v-divider vertical class="mx-2" />
        <div class="text-center">
          <div class="text-caption text-medium-emphasis">TP Terakhir</div>
          <div class="text-caption font-weight-bold">
            {{ lastTpFormatted }}
          </div>
        </div>
      </div>

    </v-card-text>

    <!-- Actions: edit safety stock -->
    <v-card-actions class="pa-3 pt-0">
      <v-spacer />
      <v-btn
        size="x-small"
        variant="tonal"
        :color="statusColor"
        prepend-icon="mdi-tune"
        @click="$emit('edit-safety', item)"
      >
        Safety Stock
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WipStock } from '@/types/Public/Welding/mutasi-wip'  
import { STOCK_STATUS_LABEL, STOCK_STATUS_COLOR } from '@/types/Public/Welding/mutasi-wip'

const props = defineProps<{
  item: WipStock
}>()

defineEmits<{
  (e: 'edit-safety', item: WipStock): void
}>()

const statusColor = computed(() => STOCK_STATUS_COLOR[props.item.stock_status])

const stockPercent = computed(() => {
  if (!props.item.safety_min) return 100
  const ss_max = props.item.safety_max || (props.item.safety_min * 2)
  return Math.min(
    Math.round((props.item.stock_current / ss_max) * 100),
    100
  )
})

const lastTpFormatted = computed(() => {
  if (!props.item.last_tp_at) return '—'
  return new Date(props.item.last_tp_at).toLocaleDateString('id-ID', {
    day:   '2-digit',
    month: 'short',
    hour:  '2-digit',
    minute: '2-digit',
  })
})
</script>

<style scoped>
.wip-stock-card {
  transition: box-shadow 0.2s;
}
.wip-stock-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}
.border-error   { border-left: 3px solid rgb(var(--v-theme-error))   !important; }
.border-warning { border-left: 3px solid rgb(var(--v-theme-warning)) !important; }
.border-success { border-left: 3px solid rgb(var(--v-theme-success)) !important; }
.border-info    { border-left: 3px solid rgb(var(--v-theme-info))    !important; }
</style>