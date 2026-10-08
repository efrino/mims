<script setup lang="ts">
import { computed, ref } from 'vue';
import { normalizeAIChatDataframe } from '@/services/AI/AIChatDataMapper';

const props = defineProps<{ data: unknown }>();
const table = computed(() => normalizeAIChatDataframe(props.data));
const isExpanded = ref(false);

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '\u2014';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function formatDataframe(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2) ?? String(data);
  } catch {
    return String(data);
  }
}
</script>

<template>
  <div class="data-table-wrapper">
    <v-btn
      variant="text"
      color="primary"
      size="small"
      class="text-none px-2 rounded-md font-weight-medium"
      :prepend-icon="isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
      @click="isExpanded = !isExpanded"
    >
      {{ isExpanded ? 'Sembunyikan konteks data' : 'Tampilkan konteks data' }}
    </v-btn>

    <v-card v-if="isExpanded" class="dataframe-wrap overflow-hidden mt-2" variant="outlined" rounded="lg">
      <template v-if="table">
        <v-card-text class="d-flex align-center justify-space-between ga-3 px-3 py-2 bg-lightsecondary text-caption text-lightText">
          <span>{{ table.rows.length }} baris data</span>
        </v-card-text>
        <v-divider color="borderLight" />

        <v-table class="dataframe-table" density="compact" fixed-header height="230">
          <thead>
            <tr>
              <th v-for="(column, columnIndex) in table.columns" :key="columnIndex" class="bg-lightprimary text-primary font-weight-bold">
                {{ column }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in table.rows" :key="rowIndex">
              <td v-for="(cell, cellIndex) in row" :key="cellIndex" class="text-darkText">{{ formatCell(cell) }}</td>
            </tr>
          </tbody>
        </v-table>
      </template>
      <v-alert v-else type="info" density="compact" variant="tonal" class="ma-3">
        Format data konteks dari server belum dikenali sebagai tabel.
      </v-alert>
    </v-card>
  </div>
</template>

<style scoped>
.data-table-wrapper {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.dataframe-wrap {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  border-color: rgb(var(--v-theme-borderLight)) !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

.dataframe-table :deep(table) {
  width: max-content;
  min-width: 100%;
  font-size: 13px;
}

.dataframe-table :deep(th),
.dataframe-table :deep(td) {
  white-space: nowrap;
  border-bottom: 1px solid rgb(var(--v-theme-borderLight)) !important;
}
</style>
