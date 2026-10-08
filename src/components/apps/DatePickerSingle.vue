<script setup>
import { ref, watch, nextTick } from "vue";
import Datepicker from "flowbite-datepicker/Datepicker";

const emit = defineEmits(["apply", "clear"]);

const props = defineProps({
  modelValue: String,
  max: String
});

const selected = ref(props.modelValue || "");
const singleModal = ref(false);

let dpInlineSingle = null;

// Init datepicker on open
watch(singleModal, async (open) => {
  if (!open) return;

  await nextTick();

  const el = document.getElementById("inline-single-datepicker");
  if (!el) return;

  // hancurkan instance lama
  if (dpInlineSingle) dpInlineSingle.destroy();

  dpInlineSingle = new Datepicker(el, {
    autohide: false,
    inline: true,
    maxDate: props.max ? new Date(props.max) : undefined
  });

  // SET DEFAULT DATE YANG BENAR
  let initial = props.modelValue
    ? new Date(props.modelValue)
    : new Date();

  if (isNaN(initial.getTime())) {
    initial = new Date();
  }

  dpInlineSingle.setDate(initial);
});


// APPLY
function apply() {
  const picked = dpInlineSingle?.getDate("yyyy-mm-dd") || null;
  
  emit("update:modelValue", picked);
  emit("apply", picked);

  singleModal.value = false;
}

// CLEAR
function clearDate() {
  selected.value = "";
  emit("update:modelValue", "");
  emit("clear");
}

// TODAY button
function goToday() {
  if (!dpInlineSingle) return;
  const today = new Date();
  dpInlineSingle.setDate(today);
  selected.value = dpInlineSingle.getDate("yyyy-mm-dd");
}

function openDialog() {
  singleModal.value = true;
}
</script>

<template>
  <v-card class="pa-3">
    <label class="block mb-1 text-center text-gray-600 text-sm">Select Date</label>

    <div class="relative max-w-sm mx-auto">
      <span class="mdi mdi-calendar-outline absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 text-lg"></span>

      <input
        type="text"
        :value="modelValue"
        @click="openDialog"
        placeholder="Select date"
        class="block w-full ps-9 pe-3 py-2.5 bg-white border rounded-base shadow-xs outline-1 outline-solid"
      />
    </div>

    <!-- MODAL -->
    <v-dialog v-model="singleModal" width="auto">
      <v-card class="pa-0">

        <div :id="`inline-single-datepicker`" inline-datepicker>
          <div class="flex justify-between px-4 pb-3 mt-3 text-blue-600 text-xs">
            <button class="py-1 px-3" @click="goToday">Today</button>
            <button class="py-1 px-3 text-red-600" @click="clearDate">Clear</button>
          </div>
        </div>

        <div class="d-flex justify-end mt-4 mb-4">
          <v-btn variant="flat" class="mr-1" @click="singleModal = false">Cancel</v-btn>
          <v-btn color="primary" class="mr-1" @click="apply">Select</v-btn>
        </div>

      </v-card>
    </v-dialog>

  </v-card>
</template>

<style>
.datepicker {
  background-color: #ffffff !important;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
              0 4px 6px -2px rgba(0,0,0,0.05) !important;
  border-radius: 0.5rem !important;
}

/* header */
.datepicker-header {
  background-color: #ffffff !important;
  color: #0f172a !important;
  font-weight: 600;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}

/* arrows */
.datepicker-header button {
  color: #0f172a !important;
  border-radius: 6px;
}
.datepicker-header button:hover {
  background-color: rgba(0,0,0,0.05) !important;
}

/* days */
.datepicker-cell {
  border-radius: 0.375rem !important;
}
.datepicker-cell:hover {
  background-color: #edf4ff !important;
}
.datepicker-cell.selected {
  background-color: #1d4ed8 !important;
  color: white !important;
}

.datepicker-cell.prev,
.datepicker-cell.next {
  color: #b8b8b8 !important;
}
</style>