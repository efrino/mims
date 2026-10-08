<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * Dropdown pilihan ganda dengan daftar tertutup.
 *
 * Dipakai di tempat yang dulu memakai input bebas: nilainya harus datang dari
 * daftar yang sudah ditentukan, sebab isinya jadi kunci di backend (mis.
 * `permissions` dan `area` pada akun STO) dan salah ketik satu huruf membuat
 * hak akses diam-diam tidak berlaku.
 */

export interface OpsiPilihan {
  value: string;
  label: string;
  /** Keterangan singkat di bawah label, opsional. */
  ket?: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    options: OpsiPilihan[];
    placeholder?: string;
    disabled?: boolean;
  }>(),
  { placeholder: '- Pilih -', disabled: false }
);

const emit = defineEmits<{ 'update:modelValue': [string[]] }>();

const terbuka = ref(false);
const akar = ref<HTMLElement | null>(null);

const terpilih = computed(() => new Set(props.modelValue));

const ringkasan = computed(() => {
  const label = props.options.filter((o) => terpilih.value.has(o.value)).map((o) => o.label);

  // Nilai yang tidak ada di daftar tetap ditampilkan apa adanya -- data lama
  // bisa memuat nilai yang sudah tidak ditawarkan lagi, dan menyembunyikannya
  // membuat admin mengira akunnya kosong.
  const asing = props.modelValue.filter((v) => !props.options.some((o) => o.value === v));

  return [...label, ...asing];
});

function toggle(value: string) {
  if (props.disabled) return;

  const berikut = new Set(props.modelValue);

  if (berikut.has(value)) {
    berikut.delete(value);
  } else {
    berikut.add(value);
  }

  // Urutkan mengikuti urutan daftar supaya hasilnya tidak bergantung pada
  // urutan klik; nilai asing ditaruh di belakang.
  const urut = props.options.map((o) => o.value).filter((v) => berikut.has(v));
  const asing = [...berikut].filter((v) => !props.options.some((o) => o.value === v));

  emit('update:modelValue', [...urut, ...asing]);
}

function kosongkan() {
  if (props.disabled) return;
  emit('update:modelValue', []);
}

function klikLuar(e: MouseEvent) {
  if (akar.value && !akar.value.contains(e.target as Node)) terbuka.value = false;
}

onMounted(() => document.addEventListener('mousedown', klikLuar));
onBeforeUnmount(() => document.removeEventListener('mousedown', klikLuar));
</script>

<template>
  <div ref="akar" class="relative">
    <button
      type="button"
      :disabled="disabled"
      class="flex w-full items-center gap-2 rounded-lg bg-gray-50 !border !border-gray-300 px-3 py-2.5 text-left text-sm text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-gray-700 dark:!border-gray-600 dark:text-white"
      @click="terbuka = !terbuka"
    >
      <span v-if="ringkasan.length === 0" class="text-gray-400">{{ placeholder }}</span>
      <span v-else class="flex flex-wrap gap-1.5">
        <span
          v-for="t in ringkasan"
          :key="t"
          class="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700"
        >
          {{ t }}
        </span>
      </span>
      <i class="mdi mdi-chevron-down ms-auto shrink-0 text-lg leading-none text-gray-400" />
    </button>

    <div
      v-if="terbuka"
      class="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg bg-white !border !border-gray-300 py-1 shadow-lg"
    >
      <label
        v-for="o in options"
        :key="o.value"
        class="flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm hover:bg-gray-50"
      >
        <input
          type="checkbox"
          class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded !border !border-gray-300 text-blue-600 focus:ring-blue-400"
          :checked="terpilih.has(o.value)"
          @change="toggle(o.value)"
        />
        <span>
          <span class="block font-medium text-gray-800">{{ o.label }}</span>
          <span v-if="o.ket" class="block text-[11px] text-gray-400">{{ o.ket }}</span>
        </span>
      </label>

      <div class="mt-1 flex justify-end !border-t !border-gray-200 px-3 py-2">
        <button type="button" class="text-xs font-medium text-gray-500 hover:text-gray-700" @click="kosongkan">
          Kosongkan pilihan
        </button>
      </div>
    </div>
  </div>
</template>
