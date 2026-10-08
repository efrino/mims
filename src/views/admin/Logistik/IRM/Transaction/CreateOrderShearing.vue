<script setup lang="ts">
import { onMounted, ref, shallowRef, computed } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useCreateOrderShearingStore } from '@/stores/Logistik/IRM/Transaction/CreateOrderShearing';
import CustomSelectSearch from '@/components/CustomSelectSearch.vue';
import { storeToRefs } from 'pinia';
import type { MaterialItems, ShearingItems } from '@/types/Logistik/IRM/Transaction/CreateOrderShearing';
import { useRouter } from 'vue-router';

const page = ref({ title: ''});
const breadcrumbs = shallowRef([
  {
    title: 'Logistik',
    disabled: false,
    href: '#'
  },
  {
    title: 'IRM',
    disabled: false,
    href: '#'
  },
  {
    title: 'Transaction',
    disabled: false,
    href: '#'
  },
  {
    title: 'Order Shearing',
    disabled: false,
    href: '#'
  },
]);
const router = useRouter();

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';

  const date = new Date(dateStr);

  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

const parseSpec = (spec: string) => {
  if (!spec) return null;

  const match = spec.match (
    /^(.+?)\s*\(([\d.,]+)MMX(\d+)MMX(\d+)MM\)$/
  );

  if (!match) return null;

  const [, code, t, w, l] = match;

  return {
    code,
    t,
    w,
    l,
  };
}

const goToPrint = () => {
  const newWindow = window.open('', '_blank');

  localStorage.setItem(
    'printOrderShearing',
    JSON.stringify({
      tanggal: formatDate(createOrderShearingStore.tanggal),
      shift: createOrderShearingStore.shift,
      mesin: createOrderShearingStore.mesin,
      operator: createOrderShearingStore.operator,
      material: selectedMaterial.value
        ? {
          job_number: selectedMaterial.value.job_number,
          spec_before: parsedSpec.value,
          spec_after: parsedShearingSpec.value,
          }
        : null,
      sheet: totalSheet.value,
      bq: bqValue.value,
      totalSheet: totalPcs.value,
      supplier: createOrderShearingStore.supplier,
    })
  );
  const route = router.resolve({ name: 'logistik-irm-transaction-create-order-shearing-print-preview' });
  newWindow!.location.href = route.href;
}

const createOrderShearingStore = useCreateOrderShearingStore();
const { materialItems, selectedMaterialNumber, shearingItems, shearingSpecs, shearingResult, shearingResultTest } = storeToRefs(createOrderShearingStore);
let selectedMaterial = ref<MaterialItems | null>(null);
let totalSheet = ref<number | null>(null);
const bqValue = ref<number>(0);
const materialSpec = ref('');
const shearingNumber = ref('');
const shearingSpec = ref('');
const shearingQtyResult = ref('');
const shearingHasil = ref('');
const parsedSpec = ref<{
  code: string;
  t: string;
  w: string;
  l: string;
} | null>(null);
const parsedShearingSpec = ref<{
  code: string;
  t: string;
  w: string;
  l: string;
} | null>(null);

const sheetAfter = computed(() => {
  return totalSheet.value ?? '';
})

const totalPcs = computed(() => {
  if (!totalSheet.value || !bqValue.value) return '';
  return totalSheet.value * bqValue.value;
})

const onMaterialChange = async (item: MaterialItems | null) => {
  materialSpec.value = '';
  selectedMaterialNumber.value = '';
  shearingNumber.value = '';
  shearingSpec.value = '';
  bqValue.value = 0;
  totalSheet.value = null;

  if (!item) return;

  materialSpec.value = item.spec;
  parsedSpec.value = parseSpec(item.spec);
  selectedMaterialNumber.value = item.part_number;
  
  await createOrderShearingStore.getShearingItems();

  if (shearingItems.value) {
    shearingNumber.value = shearingItems.value.MATNR;

    const menge = parseFloat(shearingItems.value.MENGE);
    
    bqValue.value = 
      Number.isFinite(menge) && menge > 0
        ? Math.round(1 / menge)
        : 0;
  } else {
    shearingNumber.value = '';
    bqValue.value = 0;
  }
  
  const matchedShearingSpec = shearingSpecs.value.find(
    (s) => s.part_number === shearingNumber.value
  );

  shearingSpec.value = matchedShearingSpec?.spec ?? '';
  parsedShearingSpec.value = parseSpec(shearingSpec.value);
}

const onSubmit = async () => {
  const shearing = shearingNumber.value;
  const quantity = String(totalPcs.value);

  const success = await createOrderShearingStore.submitOrderShearing(
    shearing,
    quantity
  );

  if (!success) return;

  setTimeout(() => {
    goToPrint();
  }, 500);
}

onMounted(() => {
  page.value.title = `Create Order Shearing`;
  createOrderShearingStore.getMaterialItems();
  createOrderShearingStore.getShearingSpecs();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

  <div class="items-center gap-3 mb-5">
    <div class="print-area">
      <div class="flex gap-5 bg-white p-5 rounded-xl shadow w-full">
        <div class="flex flex-wrap flex-column w-full">
          <h5 class="text-sm font-medium text-gray-900">Tanggal</h5>
          <input
            v-model="createOrderShearingStore.tanggal"
            type="date"
            name="date-input"
            id="date-input"
            class="block w-full p-2 mt-2 text-sm !border !border-gray-300 rounded-lg bg-gray-50 !focus:ring-blue-500 !focus:border-blue-500"
          />
        </div>
        <div class="flex flex-wrap flex-column w-full">
          <h5 class="text-sm font-medium text-gray-900">Shift</h5>
          <select 
            v-model="createOrderShearingStore.shift"
            name="shift" 
            id="shift" 
            class="block w-full p-2 mt-2 text-sm !border !border-gray-300 rounded-lg bg-gray-50 !focus:ring-blue-500 !focus:border-blue-500"
          >
            <option disabled selected value="">Pilih Shift</option>
            <option value="1">
              <span class="option-label">Shift 1</span>
            </option>
            <option value="2">
              <span class="option-label">Shift 2</span>
            </option>
          </select>
        </div>
        <div class="flex flex-wrap flex-column w-full">
          <h5 class="text-sm font-medium text-gray-900">Mesin</h5>
          <select 
            v-model="createOrderShearingStore.mesin"
            id="mesin" 
            name="mesin" 
            class="block w-full p-2 mt-2 text-sm !border !border-gray-300 rounded-lg bg-gray-50 !focus:ring-blue-500 !focus:border-blue-500"
          >
            <option value="" disabled selected hidden>Pilih Mesin</option>
            <option value="Baykal">
              <span class="option-label">Baykal</span>
            </option>
            <option value="Durma">
              <span class="option-label">Durma</span>
            </option>
          </select>
        </div>
        <div class="flex flex-wrap flex-column w-full">
          <h5 class="text-sm font-medium text-gray-900">Operator</h5>
          <select
            v-model="createOrderShearingStore.operator" 
            id="operator" 
            name="operator" 
            class="block w-full p-2 mt-2 text-sm !border !border-gray-300 rounded-lg bg-gray-50 !focus:ring-blue-500 !focus:border-blue-500"
          >
            <option value="" disabled selected hidden>Operator</option>
            <option value="Seto">
              <span class="option-label">Seto</span>
            </option>
          </select>
        </div>
      </div>

      <div class="flex gap-5">
        <div class="flex flex-column gap-5 bg-white p-5 rounded-xl shadow w-full">
          <h1 class="text-center text-2xl text-gray-900 font-semibold">Material Before Shearing</h1>
          <div class="flex gap-4">
            <div class="flex flex-wrap flex-column w-full">
              <CustomSelectSearch
                v-model="selectedMaterial"
                :items="materialItems"
                label="Material Number"
                @change="onMaterialChange"
              />
            </div>
          </div>
          <div class="flex flex-wrap flex-column">
            <h5 class="text-sm font-medium text-gray-900">Spesification</h5>
            <input
              type="text"
              id="mspec"
              name="mspec"
              class="block w-full p-2 mt-2 text-sm !border !border-gray-300 rounded-lg bg-gray-50 !focus:ring-blue-500 !focus:border-blue-500"
              placeholder="SPEC"
              :value="materialSpec"
              disabled />
          </div>
          <div class="flex gap-4 w-full">
            <div class="flex flex-wrap flex-column w-full">
              <h5 class="text-sm font-medium text-gray-900">Sheet</h5>
              <!-- Input User -->
              <input
                type="text"
                id="total-sheet"
                name="total-sheet"
                class="block w-full p-2 mt-2 text-sm !border !border-gray-300 rounded-lg bg-gray-50 !focus:ring-blue-500 !focus:border-blue-500"
                placeholder="Total Sheet"
                v-model.number="totalSheet"
              />
            </div>
            
            <div class="flex flex-wrap flex-column w-full">
              <h5 class="text-sm font-medium text-gray-900">Supplier</h5>
              <select 
                v-model="createOrderShearingStore.supplier"
                id="customer" 
                name="customer" 
                class="block w-full p-2 mt-2 text-sm !border !border-gray-300 rounded-lg bg-gray-50 !focus:ring-blue-500 !focus:border-blue-500"
              >
                <option value="" disabled selected hidden>Pilih Supplier</option>
                <option value="SSK">
                  <span class="option-label">SSK</span>
                </option>
                <option value="POSCO">
                  <span class="option-label">POSCO</span>
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex flex-column gap-5 bg-white p-5 rounded-xl shadow w-full">
          <h1 class="text-center text-2xl text-gray-900 font-semibold">Material After Shearing</h1>
          <div class="flex flex-wrap flex-column">
            <h5 class="text-sm font-medium text-gray-900">Material Shearing Number</h5>
            <input
              type="text"
              name="shearing-number"
              id="shearing-number"
              class="block 2-full p-2 mt-2 text-sm !border !border-gray-300 rounded-lg bg-gray-50"
              placeholder="Shearing Number"
              :value="shearingNumber"
              disabled
            />
          </div>
          <div class="flex flex-wrap flex-column">
            <h5 class="text-sm font-medium text-gray-900">Spesification</h5>
            <input
              type="text"
              id="sspec"
              name="sspec"
              class="block p-2 mt-2 text-sm !border !border-gray-300 rounded-lg bg-gray-50 !focus:ring-blue-500 !focus:border-blue-500 w-full"
              placeholder="SPEC"
              :value="shearingSpec"
              disabled
            />
          </div>
          <div class="flex gap-4">
            <div class="flex flex-wrap flex-column w-full">
              <h5 class="text-sm font-medium text-gray-900">Sheet</h5>
              <!-- Nilainya mengikuti input user -->
              <input
                type="text"
                id="sheet"
                name="sheet"
                class="block w-full p-2 mt-2 text-sm !border !border-gray-300 rounded-lg bg-gray-50 !focus:ring-blue-500 !focus:border-blue-500"
                placeholder="Sheet"
                :value="sheetAfter"
                disabled
              />
            </div>
            <div class="flex flex-wrap flex-column w-full">
              <h5 class="text-sm font-medium text-gray-900">B/Q</h5>
              <input
                type="text"
                id="bq"
                name="bq"
                class="block w-full p-2 mt-2 text-sm !border !border-gray-300 rounded-lg bg-gray-50 !focus:ring-blue-500 !focus:border-blue-500"
                placeholder="B/Q"
                :value="bqValue"
                disabled />
            </div>
            <div class="flex flex-wrap flex-column w-full">
              <h5 class="text-sm font-medium text-gray-900">Total PCS</h5>
              <input
                type="text"
                id="pcs"
                name="pcs"
                class="block w-full p-2 mt-2 text-sm !border !border-gray-300 rounded-lg bg-gray-50 !focus:ring-blue-500 !focus:border-blue-500"
                placeholder="Pcs"
                :value="totalPcs"
                disabled
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="buttons mt-8">
      <!-- <button 
        class="gap-2 inline-flex px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-800"
        @click="goToPrint"
      >
        <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
					<path stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M16.444 18H19a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2.556M17 11V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v6h10ZM7 15h10v4a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-4Z"/>
				</svg>
        Print
      </button> -->
      <button
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-gray-400 disabled:cursor-not-allowed" 
        id="btnSubmit"
        @click="onSubmit"  
      >
        Submit
      </button>
    </div>
  </div>
</template>

<style>
  .print-area {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .header-form {
    display: flex;
    gap: 20px;
    padding: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .job-material {
    display: flex;
    gap: 40px;
    width: 100%;
  }

  .job-material .form-group {
    flex: 1;
  }

  .buttons {
    display: flex;
    justify-content: center;
    gap: 12px;
  }
</style>