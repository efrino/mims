<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDiesStore } from '@/stores/Stamping/Master/Dies';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  modelValue: boolean;
  mode: 'add' | 'edit';
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit'): void;
}>();

const store = useDiesStore();
const { formData } = storeToRefs(store);

const isOpen = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
});

const isEdit = computed(() => props.mode === 'edit');
const dialogTitle = computed(() => (isEdit.value ? 'Edit Dies' : 'Tambah Dies'));
const dialogColor = computed(() => (isEdit.value ? 'warning' : 'primary'));

const codeTouched = ref(false);
const codeError = computed(() => (codeTouched.value && !formData.value.dies_code ? 'Kode Dies wajib diisi' : ''));
const isValid = computed(() => !!formData.value.dies_code);

const handleSubmit = () => {
  codeTouched.value = true;
  if (!isValid.value) return;
  emit('submit');
};

watch(isOpen, (open) => {
  if (!open) codeTouched.value = false;
});
</script>

<template>
  <v-dialog v-model="isOpen" max-width="560px" persistent>
    <v-card class="rounded-lg overflow-hidden">
      <v-card-title :class="`bg-${dialogColor}`" class="d-flex align-center pa-4 text-white">
        <v-avatar color="white" size="36" class="mr-3">
          <v-icon :color="dialogColor">mdi-puzzle-edit-outline</v-icon>
        </v-avatar>
        <div>
          <div class="text-h6 font-weight-bold">{{ dialogTitle }}</div>
          <div class="text-caption" style="opacity: 0.85;">Data tooling/mold untuk pairing ke mesin press</div>
        </div>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" color="white" @click="isOpen = false"></v-btn>
      </v-card-title>

      <v-card-text class="pa-6" style="background-color: #f8fafc;">
        <v-form @submit.prevent="handleSubmit" id="dies-form">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formData.dies_code"
                label="Kode Dies *"
                placeholder="cth. D-800-01"
                prepend-inner-icon="mdi-barcode"
                variant="outlined"
                density="comfortable"
                :error-messages="codeError"
                @blur="codeTouched = true"
                autofocus
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formData.dies_name"
                label="Nama Dies"
                prepend-inner-icon="mdi-tag-outline"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formData.part_number"
                label="Part Number"
                prepend-inner-icon="mdi-cube-outline"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formData.tonnage_required"
                label="Tonnage Dibutuhkan"
                suffix="Ton"
                type="number"
                prepend-inner-icon="mdi-weight"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field
                v-model="formData.dies_length"
                label="Panjang"
                suffix="mm"
                prepend-inner-icon="mdi-ruler"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field
                v-model="formData.dies_width"
                label="Lebar"
                suffix="mm"
                prepend-inner-icon="mdi-ruler"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="formData.note"
                label="Catatan"
                variant="outlined"
                density="comfortable"
                rows="2"
                auto-grow
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4 bg-white border-top">
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="isOpen = false">Batal</v-btn>
        <v-btn :color="dialogColor" variant="flat" type="submit" form="dies-form" :disabled="!isValid" prepend-icon="mdi-content-save">
          {{ isEdit ? 'Update' : 'Simpan' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.border-top {
  border-top: 1px solid #e2e8f0;
}
</style>
