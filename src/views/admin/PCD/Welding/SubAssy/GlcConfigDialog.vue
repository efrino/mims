<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="950px"
    persistent
    scrollable
  >
    <v-card class="rounded-xl overflow-hidden elevation-10">
      <!-- Modal Header -->
      <!-- Modal Header (Blue Theme) -->
      <v-toolbar color="primary" density="comfortable" class="px-4 text-white elevation-1" style="background: linear-gradient(135deg, #0345a1, #1976d2) !important;">
        <v-icon icon="mdi-cog-outline" color="amber-lighten-3" class="mr-2" size="22"></v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold text-white tracking-wide">
          KONFIGURASI PARAMETER CT
        </v-toolbar-title>
        <v-spacer></v-spacer>

        <!-- Area Selector Chips -->
        <div class="d-flex align-center mr-2">
          <span class="text-caption text-blue-lighten-4 mr-2 font-weight-medium">Area:</span>
          <v-chip-group
            v-model="activeArea"
            selected-class="bg-white text-primary font-weight-bold"
            mandatory
            @update:model-value="fetchConfig"
          >
            <v-chip value="SUB ASSY" size="small" variant="elevated" filter>Sub Assy</v-chip>
            <v-chip value="WSS ADM" size="small" variant="elevated" filter>WSS ADM</v-chip>
          </v-chip-group>
        </div>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          color="white"
          @click="closeModal"
        ></v-btn>
      </v-toolbar>

      <!-- Modal Body -->
      <v-card-text class="pa-4 bg-grey-lighten-4">
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-3"
          closable
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </v-alert>

        <!-- Tampilan Kosong Khusus WSS ADM (Parameter CT hanya berlaku untuk Sub Assy) -->
        <div v-if="activeArea === 'WSS ADM'" class="py-12 px-4 text-center">
          <v-card elevation="0" class="pa-8 rounded-xl border bg-white mx-auto" max-width="560">
            <v-avatar color="blue-lighten-5" size="72" class="mb-4">
              <v-icon size="36" color="primary">mdi-robot-off-outline</v-icon>
            </v-avatar>
            <h3 class="text-h6 font-weight-bold text-grey-darken-3 mb-2">Tidak Ada Konfigurasi Parameter CT</h3>
            <p class="text-body-2 text-grey-darken-1 mb-0">
              Konfigurasi Parameter CT (Stroke Gun, Slope, Moving Robot, Tip Dresser, dll.) hanya berlaku untuk pengelasan robot di <strong>Sub Assy ADM</strong>. Halaman ini tidak digunakan untuk area <strong>WSS ADM</strong>.
            </p>
          </v-card>
        </div>

        <!-- Loading Skeleton (Sub Assy) -->
        <div v-else-if="loading" class="py-10 text-center">
          <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
          <div class="text-body-2 text-grey-darken-1 mt-3">Memuat konfigurasi parameter...</div>
        </div>

        <!-- Content Card (Sub Assy) -->
        <v-card v-else elevation="1" class="rounded-lg overflow-hidden border">
          <!-- Parameter Table Header Styled with Blue -->
          <div class="text-white px-4 py-2 font-weight-bold d-flex align-center justify-space-between" style="background: #0345a1 !important;">
            <div class="d-flex align-center">
              <v-icon icon="mdi-tune-vertical" size="18" class="mr-2 text-amber-accent-2"></v-icon>
              <span>PARAMETER CT ({{ activeArea }})</span>
            </div>
            <div v-if="form.updated_at" class="text-caption text-blue-lighten-4 font-weight-regular">
              Terakhir diubah: {{ formatDateTime(form.updated_at) }} <span v-if="form.updated_by">({{ form.updated_by }})</span>
            </div>
          </div>

          <v-table density="compact" class="config-table">
            <thead>
              <tr class="bg-grey-lighten-3 text-uppercase text-caption font-weight-bold">
                <th style="width: 32%;">Parameter</th>
                <th style="width: 20%;" class="text-center">Nilai (Value)</th>
                <th style="width: 14%;" class="text-center">Satuan</th>
                <th style="width: 34%;">Keterangan / Rumus</th>
              </tr>
            </thead>
            <tbody>
              <!-- 1. Waktu 1x stroke gun -->
              <tr>
                <td class="font-weight-medium">Waktu 1x stroke gun</td>
                <td class="table-input-cell">
                  <v-text-field
                    v-model.number="form.waktu_stroke_gun"
                    type="number"
                    step="0.1"
                    min="0"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="excel-input"
                    @input="recalculateDerivedValues"
                  />
                </td>
                <td class="text-center text-grey-darken-2 font-weight-medium">detik</td>
                <td class="text-caption text-grey-darken-1">SPM = 30</td>
              </tr>

              <!-- 2. Up slope -->
              <tr>
                <td class="font-weight-medium">Up slope</td>
                <td class="table-input-cell">
                  <v-text-field
                    v-model.number="form.up_slope"
                    type="number"
                    step="1"
                    min="0"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="excel-input"
                    @input="recalculateDerivedValues"
                  />
                </td>
                <td class="text-center text-grey-darken-2 font-weight-medium">cycle</td>
                <td class="text-caption text-grey-darken-1">-</td>
              </tr>

              <!-- 3. Down slope -->
              <tr>
                <td class="font-weight-medium">Down slope</td>
                <td class="table-input-cell">
                  <v-text-field
                    v-model.number="form.down_slope"
                    type="number"
                    step="1"
                    min="0"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="excel-input"
                    @input="recalculateDerivedValues"
                  />
                </td>
                <td class="text-center text-grey-darken-2 font-weight-medium">cycle</td>
                <td class="text-caption text-grey-darken-1">-</td>
              </tr>

              <!-- 4. Welding time BAKU -->
              <tr>
                <td class="font-weight-medium">Welding time BAKU</td>
                <td class="table-input-cell">
                  <v-text-field
                    v-model.number="form.welding_time_baku"
                    type="number"
                    step="1"
                    min="0"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="excel-input"
                    @input="recalculateDerivedValues"
                  />
                </td>
                <td class="text-center text-grey-darken-2 font-weight-medium">cycle</td>
                <td class="text-caption text-grey-darken-1">default</td>
              </tr>

              <!-- 5. Frekuensi PLN -->
              <tr>
                <td class="font-weight-medium">Frekuensi PLN</td>
                <td class="table-input-cell">
                  <v-text-field
                    v-model.number="form.frekuensi_pln"
                    type="number"
                    step="1"
                    min="1"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="excel-input"
                    @input="recalculateDerivedValues"
                  />
                </td>
                <td class="text-center text-grey-darken-2 font-weight-medium">Hz</td>
                <td class="text-caption text-grey-darken-1">Standar PLN (50 Hz)</td>
              </tr>

              <!-- 6. 1 cycle (auto-calculated) -->
              <tr class="highlight-row">
                <td class="font-weight-bold text-primary">
                  1 cycle
                  <v-chip size="x-small" color="primary" variant="tonal" class="ml-1">Auto</v-chip>
                </td>
                <td class="table-input-cell">
                  <v-text-field
                    v-model.number="form.one_cycle"
                    type="number"
                    step="0.0001"
                    min="0"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="excel-input calculated-input"
                  />
                </td>
                <td class="text-center text-grey-darken-2 font-weight-medium">detik</td>
                <td class="text-caption text-primary font-weight-medium">1 / Frekuensi PLN</td>
              </tr>

              <!-- 7. Waktu gun per titik (baku) (auto-calculated) -->
              <tr class="highlight-row">
                <td class="font-weight-bold text-primary">
                  Waktu gun per titik (baku)
                  <v-chip size="x-small" color="primary" variant="tonal" class="ml-1">Auto</v-chip>
                </td>
                <td class="table-input-cell">
                  <v-text-field
                    v-model.number="form.waktu_gun_per_titik"
                    type="number"
                    step="0.01"
                    min="0"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="excel-input calculated-input"
                  />
                </td>
                <td class="text-center text-grey-darken-2 font-weight-medium">detik</td>
                <td class="text-caption text-primary font-weight-medium">stroke + slope + welding time</td>
              </tr>

              <!-- 8. Moving robot -->
              <tr>
                <td class="font-weight-medium">Moving robot</td>
                <td class="table-input-cell">
                  <v-text-field
                    v-model.number="form.moving_robot"
                    type="number"
                    step="0.1"
                    min="0"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="excel-input"
                  />
                </td>
                <td class="text-center text-grey-darken-2 font-weight-medium">detik</td>
                <td class="text-caption text-grey-darken-1">-</td>
              </tr>

              <!-- 9. Faktor kecepatan robot -->
              <tr>
                <td class="font-weight-medium">Faktor kecepatan robot</td>
                <td class="table-input-cell">
                  <v-text-field
                    v-model.number="form.faktor_kecepatan_robot"
                    type="number"
                    step="0.05"
                    min="0"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="excel-input"
                  />
                </td>
                <td class="text-center text-grey-darken-2 font-weight-medium">x</td>
                <td class="text-caption text-grey-darken-1">-</td>
              </tr>

              <!-- 10. Tip dresser -->
              <tr>
                <td class="font-weight-medium">Tip dresser</td>
                <td class="table-input-cell">
                  <v-text-field
                    v-model.number="form.tip_dresser"
                    type="number"
                    step="1"
                    min="0"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="excel-input"
                  />
                </td>
                <td class="text-center text-grey-darken-2 font-weight-medium">detik</td>
                <td class="text-caption text-grey-darken-1">-</td>
              </tr>

              <!-- 11. Tip change -->
              <tr>
                <td class="font-weight-medium">Tip change</td>
                <td class="table-input-cell">
                  <v-text-field
                    v-model.number="form.tip_change"
                    type="number"
                    step="1"
                    min="0"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="excel-input"
                  />
                </td>
                <td class="text-center text-grey-darken-2 font-weight-medium">detik</td>
                <td class="text-caption text-grey-darken-1">-</td>
              </tr>

              <!-- 12. Faktor CT (efisiensi) -->
              <tr>
                <td class="font-weight-medium">Faktor CT (efisiensi)</td>
                <td class="table-input-cell">
                  <v-text-field
                    v-model.number="form.faktor_ct"
                    type="number"
                    step="0.05"
                    min="0"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="excel-input"
                  />
                </td>
                <td class="text-center text-grey-darken-2 font-weight-medium">x</td>
                <td class="text-caption text-grey-darken-1">-</td>
              </tr>

              <!-- 13. Blok maksimum untuk 1 MP -->
              <tr>
                <td class="font-weight-medium">Blok maksimum untuk 1 MP</td>
                <td class="table-input-cell">
                  <v-text-field
                    v-model.number="form.blok_maksimum_mp"
                    type="number"
                    step="0.5"
                    min="0"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="excel-input"
                  />
                </td>
                <td class="text-center text-grey-darken-2 font-weight-medium">jam</td>
                <td class="text-caption text-grey-darken-1">1 shift = 8 jam, 1 shift + PJK = 11 jam; di atas ini 2 MP</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-card-text>

      <!-- Modal Footer -->
      <v-card-actions class="px-5 py-3 bg-white border-t d-flex justify-space-between align-center">
        <template v-if="activeArea === 'WSS ADM'">
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="flat"
            class="px-5 font-weight-bold"
            @click="closeModal"
          >
            Tutup
          </v-btn>
        </template>
        <template v-else>
          <v-btn
            color="grey-darken-1"
            variant="tonal"
            prepend-icon="mdi-restore"
            size="small"
            :disabled="saving || loading"
            @click="resetToFactoryDefault"
          >
            Reset Default
          </v-btn>

          <div class="d-flex gap-2">
            <v-btn
              color="grey-darken-2"
              variant="text"
              :disabled="saving"
              @click="closeModal"
            >
              Batal
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-content-save-outline"
              :loading="saving"
              :disabled="loading"
              @click="saveConfig"
              class="px-5 font-weight-bold"
            >
              Simpan Konfigurasi
            </v-btn>
          </div>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { getGlcConfig, saveGlcConfig as apiSaveGlcConfig } from '@/services/PCD/Welding/SubAssySimulation';
import { useNotificationStore } from '@/stores/notification';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  area: {
    type: String,
    default: 'SUB ASSY'
  }
});

const emit = defineEmits(['update:modelValue', 'saved']);

const notificationStore = useNotificationStore();
const activeArea = ref<string>(props.area || 'SUB ASSY');
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');

const defaultValues = {
  waktu_stroke_gun: 2.00,
  up_slope: 2.00,
  down_slope: 2.00,
  welding_time_baku: 33.00,
  frekuensi_pln: 50.00,
  one_cycle: 0.0200,
  waktu_gun_per_titik: 2.7400,
  moving_robot: 3.30,
  faktor_kecepatan_robot: 1.00,
  tip_dresser: 40.00,
  tip_change: 60.00,
  faktor_ct: 1.10,
  blok_maksimum_mp: 11.00,
  keterangan: '',
  updated_at: '',
  updated_by: ''
};

const form = ref<any>({ ...defaultValues });

const recalculateDerivedValues = () => {
  const freq = Number(form.value.frekuensi_pln) || 50;
  if (freq > 0) {
    form.value.one_cycle = Number((1 / freq).toFixed(4));
  } else {
    form.value.one_cycle = 0.0200;
  }

  const stroke = Number(form.value.waktu_stroke_gun) || 0;
  const up = Number(form.value.up_slope) || 0;
  const down = Number(form.value.down_slope) || 0;
  const weld = Number(form.value.welding_time_baku) || 0;

  const totalCycle = up + down + weld;
  const totalDetikCycle = totalCycle * form.value.one_cycle;
  form.value.waktu_gun_per_titik = Number((stroke + totalDetikCycle).toFixed(4));
};

const fetchConfig = async () => {
  if (activeArea.value === 'WSS ADM') {
    loading.value = false;
    errorMessage.value = '';
    return;
  }
  loading.value = true;
  errorMessage.value = '';
  try {
    const res: any = await getGlcConfig(activeArea.value);
    if (res && res.data && res.data.data) {
      const data = res.data.data;
      form.value = {
        waktu_stroke_gun: Number(data.waktu_stroke_gun ?? 2.00),
        up_slope: Number(data.up_slope ?? 2.00),
        down_slope: Number(data.down_slope ?? 2.00),
        welding_time_baku: Number(data.welding_time_baku ?? 33.00),
        frekuensi_pln: Number(data.frekuensi_pln ?? 50.00),
        one_cycle: Number(data.one_cycle ?? 0.0200),
        waktu_gun_per_titik: Number(data.waktu_gun_per_titik ?? 2.7400),
        moving_robot: Number(data.moving_robot ?? 3.30),
        faktor_kecepatan_robot: Number(data.faktor_kecepatan_robot ?? 1.00),
        tip_dresser: Number(data.tip_dresser ?? 40.00),
        tip_change: Number(data.tip_change ?? 60.00),
        faktor_ct: Number(data.faktor_ct ?? 1.10),
        blok_maksimum_mp: Number(data.blok_maksimum_mp ?? 11.00),
        keterangan: data.keterangan || '',
        updated_at: data.updated_at || '',
        updated_by: data.updated_by || ''
      };
      // Ensure recalculation
      recalculateDerivedValues();
    }
  } catch (err: any) {
    console.error('Error fetching config:', err);
    errorMessage.value = err?.response?.data?.message || 'Gagal memuat data konfigurasi';
  } finally {
    loading.value = false;
  }
};

const saveConfig = async () => {
  recalculateDerivedValues();
  saving.value = true;
  errorMessage.value = '';

  const payload = {
    area: activeArea.value,
    waktu_stroke_gun: Number(form.value.waktu_stroke_gun),
    up_slope: Number(form.value.up_slope),
    down_slope: Number(form.value.down_slope),
    welding_time_baku: Number(form.value.welding_time_baku),
    frekuensi_pln: Number(form.value.frekuensi_pln),
    one_cycle: Number(form.value.one_cycle),
    waktu_gun_per_titik: Number(form.value.waktu_gun_per_titik),
    moving_robot: Number(form.value.moving_robot),
    faktor_kecepatan_robot: Number(form.value.faktor_kecepatan_robot),
    tip_dresser: Number(form.value.tip_dresser),
    tip_change: Number(form.value.tip_change),
    faktor_ct: Number(form.value.faktor_ct),
    blok_maksimum_mp: Number(form.value.blok_maksimum_mp),
    keterangan: form.value.keterangan || '',
    updated_by: localStorage.getItem('username') || 'User'
  };

  try {
    const res: any = await apiSaveGlcConfig(payload);
    if (res && res.data && res.data.status === 'success') {
      notificationStore.showDialogSuccess('Berhasil', `Konfigurasi parameter CT ${activeArea.value} berhasil disimpan!`);
      emit('saved', res.data.data);
      closeModal();
    } else {
      throw new Error(res?.data?.message || 'Gagal menyimpan konfigurasi');
    }
  } catch (err: any) {
    console.error('Error saving config:', err);
    errorMessage.value = err?.response?.data?.message || err?.message || 'Terjadi kesalahan saat menyimpan';
    notificationStore.showDialogError('Error', errorMessage.value);
  } finally {
    saving.value = false;
  }
};

const resetToFactoryDefault = () => {
  form.value = {
    ...defaultValues,
    updated_at: form.value.updated_at,
    updated_by: form.value.updated_by
  };
  recalculateDerivedValues();
};

const closeModal = () => {
  emit('update:modelValue', false);
};

const formatDateTime = (str: string) => {
  if (!str) return '-';
  try {
    const d = new Date(str);
    return d.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return str;
  }
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      activeArea.value = props.area || 'SUB ASSY';
      fetchConfig();
    }
  }
);
</script>

<style scoped>
.config-table {
  width: 100%;
  border-collapse: collapse;
}

.config-table th {
  background-color: #f1f5f9;
  color: #334155;
  border-bottom: 2px solid #cbd5e1;
  padding: 8px 12px !important;
}

.config-table td {
  padding: 6px 12px !important;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
}

.table-input-cell {
  padding: 4px 8px !important;
}

/* Excel-like light green background cell style as seen in reference image */
.excel-input :deep(.v-field) {
  background-color: #d1f2d9 !important;
  border-radius: 6px;
  font-weight: 600;
  color: #14532d;
  transition: all 0.2s ease;
}

.excel-input :deep(input) {
  text-align: center;
  font-size: 0.95rem;
  padding-top: 6px;
  padding-bottom: 6px;
}

.excel-input :deep(.v-field:hover) {
  background-color: #bbf7d0 !important;
}

.excel-input :deep(.v-field--focused) {
  background-color: #ffffff !important;
  box-shadow: 0 0 0 2px #16a34a !important;
}

.calculated-input :deep(.v-field) {
  background-color: #e2f0d9 !important;
  border: 1px dashed #22c55e;
}

.highlight-row {
  background-color: #f0fdf4 !important;
}

.gap-2 {
  gap: 8px;
}
</style>
