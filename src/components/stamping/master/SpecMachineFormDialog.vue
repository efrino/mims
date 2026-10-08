<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSpecMachinePressStore } from '@/stores/Stamping/Master/SpecMachine';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  modelValue: boolean;
  mode: 'add' | 'edit';
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit'): void;
}>();

const store = useSpecMachinePressStore();
const { formData, dataTable } = storeToRefs(store);

const isOpen = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
});

const isEdit = computed(() => props.mode === 'edit');
const dialogTitle = computed(() => (isEdit.value ? 'Edit Spec Machine Press' : 'Tambah Spec Machine Press'));
const dialogIcon = computed(() => (isEdit.value ? 'mdi-pencil-box-outline' : 'mdi-plus-box-outline'));
const dialogColor = computed(() => (isEdit.value ? 'warning' : 'primary'));

const machineTouched = ref(false);

// --- Autocomplete sumber data: nilai unik yang sudah ada, tapi tetap boleh isi baru ---
const areaOptions = computed(() => {
  const set = new Set((dataTable.value || []).map(m => m.area).filter(Boolean) as string[]);
  return Array.from(set).sort();
});

const lineOptions = computed(() => {
  const relevant = (dataTable.value || []).filter(m => !formData.value.area || m.area === formData.value.area);
  const set = new Set(relevant.map(m => m.line).filter(Boolean) as string[]);
  return Array.from(set).sort();
});

const pressTypeOptions = ['Single Crank', 'Double Crank', 'Progressive', 'Transfer', 'Hydraulic', 'Mechanical'];

// --- Peringatan duplikat: mesin dengan nama sama di line sama (kecuali baris yang sedang diedit) ---
const duplicateWarning = computed(() => {
  if (!formData.value.machine || !formData.value.line) return null;
  const dup = (dataTable.value || []).find(m =>
    String(m.id) !== String(formData.value.id) &&
    (m.is_deleted === '0' || m.is_deleted === 0 || !m.is_deleted) &&
    (m.machine || '').trim().toLowerCase() === formData.value.machine.trim().toLowerCase() &&
    (m.line || '').trim().toLowerCase() === formData.value.line.trim().toLowerCase()
  );
  return dup ? `Sudah ada mesin "${dup.machine}" di Line ${dup.line}.` : null;
});

const machineError = computed(() => (machineTouched.value && !formData.value.machine ? 'Machine wajib diisi' : ''));

const isValid = computed(() => !!formData.value.machine);

const handleSubmit = () => {
  machineTouched.value = true;
  if (!isValid.value) return;
  emit('submit');
};

watch(isOpen, (open) => {
  if (!open) machineTouched.value = false;
});
</script>

<template>
  <v-dialog v-model="isOpen" max-width="960px" persistent>
    <v-card class="rounded-lg overflow-hidden">
      <v-card-title :class="`bg-${dialogColor}`" class="d-flex align-center pa-4 text-white">
        <v-avatar color="white" size="36" class="mr-3">
          <v-icon :color="dialogColor">{{ dialogIcon }}</v-icon>
        </v-avatar>
        <div>
          <div class="text-h6 font-weight-bold">{{ dialogTitle }}</div>
          <div class="text-caption" style="opacity: 0.85;">Lengkapi spesifikasi mesin press dengan akurat</div>
        </div>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" color="white" @click="isOpen = false"></v-btn>
      </v-card-title>

      <v-card-text class="pa-0" style="background-color: #f8fafc;">
        <v-row no-gutters>
          <!-- Kolom Form -->
          <v-col cols="12" md="7" class="pa-6">
            <v-form @submit.prevent="handleSubmit" id="spec-machine-smart-form">
              <div class="form-section-label">
                <v-icon size="16" class="mr-1" color="primary">mdi-map-marker-radius-outline</v-icon>
                Identitas &amp; Lokasi
              </div>
              <v-row dense>
                <v-col cols="12">
                  <v-text-field
                    v-model="formData.machine"
                    label="Machine *"
                    placeholder="cth. MACHINE G1"
                    prepend-inner-icon="mdi-cog-outline"
                    variant="outlined"
                    density="comfortable"
                    :error-messages="machineError"
                    @blur="machineTouched = true"
                    autofocus
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-combobox
                    v-model="formData.area"
                    :items="areaOptions"
                    label="Area"
                    placeholder="cth. STAMPING"
                    prepend-inner-icon="mdi-domain"
                    variant="outlined"
                    density="comfortable"
                    hint="Pilih dari daftar atau ketik baru"
                    persistent-hint
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-combobox
                    v-model="formData.line"
                    :items="lineOptions"
                    label="Line"
                    placeholder="cth. G"
                    prepend-inner-icon="mdi-view-column-outline"
                    variant="outlined"
                    density="comfortable"
                    hint="Menentukan posisi di Factory Layout"
                    persistent-hint
                  />
                </v-col>
              </v-row>

              <div class="form-section-label mt-4">
                <v-icon size="16" class="mr-1" color="primary">mdi-cog-clockwise</v-icon>
                Spesifikasi Teknis
              </div>
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-combobox
                    v-model="formData.press_type"
                    :items="pressTypeOptions"
                    label="Tipe Press"
                    placeholder="cth. Single Crank"
                    prepend-inner-icon="mdi-shape-outline"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="formData.tonnage"
                    label="Tonnage"
                    placeholder="cth. 600"
                    suffix="Ton"
                    prepend-inner-icon="mdi-weight"
                    variant="outlined"
                    density="comfortable"
                    type="number"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="formData.stroke"
                    label="Stroke"
                    placeholder="cth. 300"
                    suffix="mm"
                    prepend-inner-icon="mdi-arrow-expand-vertical"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="formData.die_size"
                    label="Die Size"
                    placeholder="cth. 800x800"
                    prepend-inner-icon="mdi-square-outline"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
              </v-row>

              <div class="form-section-label mt-4">
                <v-icon size="16" class="mr-1" color="primary">mdi-note-text-outline</v-icon>
                Catatan Tambahan
              </div>
              <v-textarea
                v-model="formData.note"
                placeholder="Opsional, mis. kondisi mesin, jadwal maintenance, dll."
                variant="outlined"
                density="comfortable"
                rows="3"
                auto-grow
              />

              <v-alert
                v-if="duplicateWarning"
                type="warning"
                variant="tonal"
                density="compact"
                class="mt-2"
                icon="mdi-alert-outline"
              >
                {{ duplicateWarning }}
              </v-alert>
            </v-form>
          </v-col>

          <!-- Kolom Preview -->
          <v-col cols="12" md="5" class="pa-6 preview-pane">
            <div class="text-caption font-weight-bold text-grey-darken-1 mb-3 d-flex align-center">
              <v-icon size="16" class="mr-1">mdi-eye-outline</v-icon>
              PRATINJAU KARTU MESIN
            </div>

            <div class="preview-card-wrapper">
              <div class="preview-machine-card">
                <div class="preview-machine-header">
                  {{ formData.machine || 'NAMA MESIN' }}
                </div>
                <div class="preview-machine-body">
                  <div class="preview-spec-row" v-if="formData.press_type">
                    <span class="preview-label">Type</span>
                    <span class="preview-value">{{ formData.press_type }}</span>
                  </div>
                  <div class="preview-spec-row" v-if="formData.tonnage">
                    <span class="preview-label">Tonnage</span>
                    <span class="preview-value">{{ formData.tonnage }} Ton</span>
                  </div>
                  <div class="preview-spec-row" v-if="formData.stroke">
                    <span class="preview-label">Stroke</span>
                    <span class="preview-value">{{ formData.stroke }} mm</span>
                  </div>
                  <div class="preview-spec-row" v-if="formData.die_size">
                    <span class="preview-label">Die Size</span>
                    <span class="preview-value">{{ formData.die_size }}</span>
                  </div>
                  <div v-if="!formData.press_type && !formData.tonnage && !formData.stroke && !formData.die_size" class="text-caption text-grey text-center pa-2">
                    Isi spesifikasi teknis untuk melihat pratinjau
                  </div>
                </div>
              </div>
            </div>

            <div class="preview-meta mt-4">
              <div class="d-flex align-center mb-2">
                <v-icon size="16" class="mr-2" color="grey-darken-1">mdi-domain</v-icon>
                <span class="text-body-2">{{ formData.area || '-' }}</span>
              </div>
              <div class="d-flex align-center">
                <v-icon size="16" class="mr-2" color="grey-darken-1">mdi-view-column-outline</v-icon>
                <span class="text-body-2">Line {{ formData.line || '-' }}</span>
              </div>
            </div>

            <v-alert v-if="isEdit" type="info" variant="tonal" density="compact" class="mt-4" icon="mdi-information-outline">
              Perubahan akan langsung memengaruhi posisi mesin di Factory Layout.
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="pa-4 bg-white border-top">
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="isOpen = false">Batal</v-btn>
        <v-btn :color="dialogColor" variant="flat" type="submit" form="spec-machine-smart-form" :disabled="!isValid" prepend-icon="mdi-content-save">
          {{ isEdit ? 'Update' : 'Simpan' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.form-section-label {
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e2e8f0;
}

.preview-pane {
  background-color: #eef2f7;
  border-left: 1px solid #e2e8f0;
}

.preview-card-wrapper {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}

.preview-machine-card {
  width: 200px;
  border: 2px solid #1565c0;
  border-radius: 6px;
  background-color: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.preview-machine-header {
  background-color: #1565c0;
  color: white;
  font-weight: bold;
  font-size: 13px;
  text-align: center;
  padding: 10px 8px;
}

.preview-machine-body {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 48px;
}

.preview-spec-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 2px 4px;
}

.preview-label {
  color: #64748b;
  font-weight: 600;
}

.preview-value {
  color: #0f172a;
  font-weight: 700;
}

.preview-meta {
  background-color: white;
  border-radius: 8px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
}

.border-top {
  border-top: 1px solid #e2e8f0;
}
</style>
