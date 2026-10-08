<script setup>
import { ref, watch, nextTick } from "vue";
import Datepicker from "flowbite-datepicker/Datepicker";
import { initFlowbite } from "flowbite";

const emit = defineEmits(["apply", "cancel", "clear"]);

const dateFilterMode = ref("Date");
const singleDate = ref("");
const rangeStart = ref("");
const rangeEnd = ref("");

const singleModal = ref(false);
const rangeModal = ref(false); // 'start' | 'end' | false

let dpInlineSingle = null;
let dpInlineStart = null;
let dpInlineEnd = null;

const rangeEndKey = ref(0);

watch(() => rangeModal.value, (val) => {
  if (val === 'end') {
    // reset DOM biar Flowbite init ulang
    rangeEndKey.value++;
    nextTick(() => {
      initFlowbite(); // WAJIB panggil ulang Flowbite
    });
  }
});

function formatDate(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

watch(singleModal, async (open) => {
  if (!open) return;

  await nextTick();
  const el = document.getElementById("inline-single-datepicker");
  if (el) {
    dpInlineSingle = new Datepicker(el, {
      autohide: false,
      inline: true,
    });
  }
});

watch(
  () => rangeModal.value === "start",
  async (open) => {
    if (!open) return;

    await nextTick();
    const el = document.getElementById("inline-range-start");
    if (el) {
      dpInlineStart = new Datepicker(el, {
        autohide: false,
        inline: true,
      });
    }
  }
);

watch(
  () => rangeModal.value === "end",
  async (open) => {
    if (!open) return;

    await nextTick();
    const el = document.getElementById("inline-range-end");
    if (el) {
      dpInlineEnd = new Datepicker(el, {
        autohide: false,
        inline: true,
      });
    }
  }
);

function apply() {
  if (dateFilterMode.value === "Date") {
    emit("update:modelValue", [singleDate.value || null]);
    emit("apply");
  } else {
    emit("update:modelValue", [
      rangeStart.value || null,
      rangeEnd.value || null,
    ]);
    emit("apply");
  }
}

function clearDates() {
  singleDate.value = "";
  rangeStart.value = "";
  rangeEnd.value = "";
  emit("clear");
}

function confirmSingle() {
  singleDate.value = formatDate(dpInlineSingle?.getDate());
  singleModal.value = false;
}

function confirmRangeStart() {
  const date = dpInlineStart?.getDate();
  rangeStart.value = formatDate(date);
  rangeModal.value = false;
}

function confirmRangeEnd() {
  const date = dpInlineEnd?.getDate();
  rangeEnd.value = formatDate(date);
  rangeModal.value = false;
}

function goTodaySingle() {
  if (!dpInlineSingle) return;

  const today = new Date();
  dpInlineSingle.setDate(today);
  singleDate.value = formatDate(today);
}

function clearSingle() {
  if (!dpInlineSingle) return;
  dpInlineSingle.setDate(null);
  singleDate.value = "";
}

function goTodayStart() {
  if (dpInlineStart) dpInlineStart.setDate(new Date());
}

function clearStart() {
  if (dpInlineStart) dpInlineStart.setDate(null);
}

function goTodayEnd() {
  if (dpInlineEnd) dpInlineEnd.setDate(new Date());
}

function clearEnd() {
  if (dpInlineEnd) dpInlineEnd.setDate(null);
}
</script>

<template>
  <v-card class="pa-2">
    <v-card-title class="text-h6 d-flex justify-space-between align-center">
      <div class="d-flex align-center gap-2">
        <span class="mr-6">Date Picker</span>
        <v-select
          v-model="dateFilterMode"
          :items="['Date', 'Range Date']"
          density="comfortable"
          variant="outlined"
          hide-details
          style="min-width: 220px"
        />
      </div>
    </v-card-title>

    <v-divider />

    <v-card-text>
      <!-- SINGLE -->
      <div v-if="dateFilterMode !== 'Range Date'" class="mt-3 text-center">
        <label class="block mb-1 text-gray-600 text-sm">Select Date</label>

        <div class="relative max-w-sm mx-auto">
          <span class="mdi mdi-calendar-outline absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 text-lg"></span>
          <input
            type="text"
            v-model="singleDate"
            @click="singleModal = true"
            placeholder="Select date"
            class="block w-full ps-9 pe-3 py-2.5 bg-white border rounded-base shadow-xs rounded-sm outline-1 outline-solid"
          />
        </div>
      </div>

      <!-- RANGE -->
      <div v-else class="mt-3 text-center">
        <label class="block mb-1 text-gray-600 text-sm">Select Range Date</label>

        <div class="flex justify-center items-center gap-3">
          
          <!-- Start -->
           <div >
            <div class="relative max-w-sm mx-auto">
              <span class="mdi mdi-calendar-outline absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 text-lg"></span>
              <input
                type="text"
                v-model="rangeStart"
                @click="rangeModal = 'start'"
                placeholder="Start"
                class="block w-full ps-9 pe-3 py-2.5 bg-white border rounded-base shadow-xs rounded-sm outline-1 outline-solid"
              />
            </div>
            
            <span>to</span>

            <!-- End -->
            <div class="relative max-w-sm mx-auto">
            <span class="mdi mdi-calendar-outline absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 text-lg"></span>
              <input
                type="text"
                v-model="rangeEnd"
                @click="rangeModal = 'end'"
                placeholder="End"
                class="block w-full ps-9 pe-3 py-2.5 bg-white border rounded-base shadow-xs rounded-sm outline-1 outline-solid"
              />
            </div>
          </div>
        </div>
      </div>
    </v-card-text>

    <v-divider />

    <v-card-actions class="justify-end">
      <v-btn color="error" variant="text" @click="clearDates">Cancel</v-btn>
      <v-btn color="primary" variant="flat" @click="apply">Apply</v-btn>
    </v-card-actions>

    <v-dialog v-model="singleModal" width="auto">
      <v-card class="pa-0">

        <!-- Inline datepicker -->
        <div 
          id="inline-single-datepicker"
          inline-datepicker
        >
          <div class="flex justify-between px-4 pb-3 mt-3 text-blue-600 text-xs">
            <button 
              class="py-1 px-3"
              @click="goTodaySingle"
              variant="text"
            >
              Today
            </button>

            <button 
              class="py-1 px-3 text-red-600 text-xs"
              @click="clearSingle"
              variant="text"
            >
              Clear
            </button>
          </div>
        </div>

        <div class="d-flex justify-end mt-4 mb-4">
          <v-btn variant="flat" class="mr-1" @click="singleModal = false">Cancel</v-btn>
          <v-btn color="primary" class="mr-1" @click="confirmSingle">Select</v-btn>
        </div>
        
      </v-card>
    </v-dialog>

    <!-- RANGE START -->
    <v-dialog 
      :model-value="rangeModal==='start'"
      @update:model-value="val => rangeModal = val ? 'start' : false"
      width="auto"
    >
      <v-card class="pa-3">
        <div 
          id="inline-range-start"
          inline-datepicker
          datepicker-buttons
          datepicker-autoselect-today
        >
          <div class="flex justify-between px-4 pb-3 mt-3 text-blue-600 text-xs">
            <button 
              class="py-1 px-3"
              @click="goTodayStart"
              variant="text"
            >
              Today
            </button>

            <button 
              class="py-1 px-3 text-red-600 text-xs"
              @click="clearStart"
              variant="text"
            >
              Clear
            </button>
          </div>
        </div>

        <div class="text-right mt-3">
          <v-btn  variant="flat" class="mr-1" @click="rangeModal=false">Cancel</v-btn>
          <v-btn color="primary" class="mr-1" @click="confirmRangeStart">Select</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- RANGE END -->
    <v-dialog 
      :model-value="rangeModal==='end'"
      @update:model-value="val => rangeModal = val ? 'end' : false"
      width="auto"
    >
      <v-card class="pa-3">
        <div
          :key="rangeEndKey"
          id="inline-range-end"
        >
          <div class="flex justify-between px-4 pb-3 mt-3 text-blue-600 text-xs">
            <button 
              class="py-1 px-3"
              @click="goTodayEnd"
              variant="text"
            >
              Today
            </button>

            <button 
              class="py-1 px-3 text-red-600 text-xs"
              @click="clearEnd"
              variant="text"
            >
              Clear
            </button>
          </div>
        </div>

        <div class="text-right mt-3">
          <v-btn variant="flat" class="mr-1" @click="rangeModal=false">Cancel</v-btn>
          <v-btn color="primary" class="mr-1" @click="confirmRangeEnd">Select</v-btn>
        </div>
      </v-card>
    </v-dialog>

  </v-card>
</template>

<style>
/* calendar container */
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

/* Grey color for dates outside month */
.datepicker-cell.prev,
.datepicker-cell.next {
  color: #b8b8b8 !important;
}

</style>
