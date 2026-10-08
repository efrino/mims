<template>
  <div class="w-full px-4 py-6">
    <div class="mb-6">
      <div class="flex flex-wrap items-center justify-between border-b border-gray-200 pb-4">
        <h2 class="text-xl font-bold text-gray-800 mr-2 flex items-center gap-2">
          Plan Delivery Dashboard
        </h2>

        <div class="flex justify-end w-full lg:w-auto mt-4 lg:mt-0">
          <div class="flex flex-wrap gap-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              v-for="tabItem in tabs"
              :key="tabItem.value"
              @click="tab = tabItem.value"
              :class="[
                'px-4 py-2 text-sm font-semibold rounded-md transition-all duration-300',
                tab === tabItem.value
                  ? 'bg-blue-600 text-white shadow-md scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              ]"
            >
              {{ tabItem.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-10">
      <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
    </div>

    <div v-else-if="error" class="flex justify-center py-10">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-md">
        <p class="text-red-600 mb-4 font-medium">{{ error }}</p>
        <button
          @click="fetchData"
          class="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors shadow-lg"
        >
          Coba Lagi
        </button>
      </div>
    </div>

    <div v-else class="space-y-6">

      <!--
        Hapus: overflow-x-auto  → biarkan chart mengatur scrollnya sendiri
        Hapus: p-5              → padding dalam card mengurangi lebar efektif chart
        Tetap: bg-white, border, rounded, shadow untuk visual card
      -->
      <div class="bg-white border border-gray-200 rounded-xl shadow-sm">
        <PlanDeliveryChart :key="tab" :model="tab" :chartData="filteredData" />
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PlanDeliveryChart from '@/views/dashboard/components/chart/PlanDeliveryChart.vue'
import { usePlanDeliveryStore } from '@/stores/Admin/PlanDelivery'

const store = usePlanDeliveryStore()
const tab   = ref('ADM_SAP')

const tabs = [
  { value: 'ADM_SAP',  label: 'ADM SAP' },
  { value: 'ADM_KAP',  label: 'ADM KAP' },
  { value: 'DN_HMMI',  label: 'HMMI'    },
  { value: 'MKM',      label: 'MKM'     },
  { value: 'MMKI',     label: 'MMKI'    },
  { value: 'TMMIN',    label: 'TMMIN'   },
]

const loading = computed(() => store.loading)
const error   = computed(() => store.error)

const currentTime = ref(new Date())
let clockInterval = null

const filteredData = computed(() => {
  const rawData = store.mdfo || []
  const dataSesuaiTab = rawData.filter(item => {
    const namaCustomerDariTab = tab.value.replace('_', ' ')
    return item.customer === namaCustomerDariTab
  })

  return dataSesuaiTab.filter(item => {
    if (!item.model || String(item.model).trim() === '' || item.model === 'null') {
      return false
    }
    const apakahAdaNilaiValid = Array.from({ length: 31 }, (_, i) => `t${i + 1}`).some(key => {
      if (item[key] === undefined || item[key] === null) return false
      const nilaiBersih = String(item[key]).trim()
      const nilaiAngka  = Number(nilaiBersih)
      return !isNaN(nilaiAngka) && nilaiAngka > 0
    })
    return apakahAdaNilaiValid
  })
})

const currentDay   = computed(() => currentTime.value.getDate())
const currentMonth = computed(() => currentTime.value.toLocaleString('default', { month: 'long' }).toUpperCase())
const currentYear  = computed(() => currentTime.value.toLocaleString('default', { year: 'numeric' }))

const circleDeliveryMatrix = ref([
  {
    name: 'ADM PLANT 5',
    slots: [
      { time: '07:40', c: 1,    p: 14,   ad: 14   },
      { time: '08:00', c: 2,    p: 19,   ad: 19   },
      { time: '09:00', c: 3,    p: 4,    ad: 4    },
      { time: '10:35', c: 4,    p: 7,    ad: 7    },
      { time: '11:35', c: 5,    p: 4,    ad: 4    },
      { time: '12:15', c: 6,    p: 10,   ad: 10   },
      { time: '13:00', c: null, p: null, ad: null },
      { time: '14:20', c: 7,    p: 14,   ad: 14   },
      { time: '15:00', c: null, p: null, ad: null },
      { time: '16:00', c: null, p: null, ad: null },
      { time: '17:00', c: null, p: null, ad: null },
      { time: '18:00', c: null, p: null, ad: null },
      { time: '19:40', c: 8,    p: 4,    ad: 4    },
      { time: '20:50', c: 9,    p: 5,    ad: 5    },
      { time: '21:00', c: null, p: null, ad: null },
      { time: '22:45', c: 10,   p: 2,    ad: 2    },
      { time: '23:00', c: null, p: null, ad: null },
      { time: '00:40', c: 11,   p: 13,   ad: 13   },
      { time: '01:00', c: null, p: null, ad: null },
      { time: '02:45', c: 12,   p: 3,    ad: 3    },
      { time: '03:15', c: 13,   p: 1,    ad: 1    },
      { time: '04:00', c: null, p: null, ad: null },
      { time: '05:00', c: null, p: null, ad: null },
      { time: '06:00', c: null, p: null, ad: null },
    ]
  },
  {
    name: 'TMMIN',
    slots: [
      { time: '07:00', c: null, p: null, ad: null },
      { time: '08:17', c: 1,    p: 6,    ad: 6    },
      { time: '09:00', c: null, p: null, ad: null },
      { time: '10:00', c: null, p: null, ad: null },
      { time: '11:43', c: 2,    p: 8,    ad: 8    },
      { time: '12:00', c: null, p: null, ad: null },
      { time: '13:00', c: null, p: null, ad: null },
      { time: '14:00', c: null, p: null, ad: null },
      { time: '15:00', c: null, p: null, ad: null },
      { time: '16:39', c: 3,    p: 2,    ad: 2    },
      { time: '17:00', c: null, p: null, ad: null },
      { time: '18:00', c: null, p: null, ad: null },
      { time: '19:08', c: 4,    p: 6,    ad: 6    },
      { time: '20:01', c: 5,    p: 1,    ad: 1    },
      { time: '21:07', c: 6,    p: 1,    ad: 1    },
      { time: '22:59', c: 7,    p: 8,    ad: 8    },
      { time: '23:00', c: null, p: null, ad: null },
      { time: '00:00', c: null, p: null, ad: null },
      { time: '01:30', c: 8,    p: 5,    ad: 5    },
      { time: '02:00', c: null, p: null, ad: null },
      { time: '03:00', c: null, p: null, ad: null },
      { time: '04:00', c: null, p: null, ad: null },
      { time: '05:00', c: null, p: null, ad: null },
      { time: '06:00', c: null, p: null, ad: null },
    ]
  }
])

const getCellBgClass = (slotTime, type, slotItem) => {
  const nowHours   = currentTime.value.getHours()
  const nowMinutes = currentTime.value.getMinutes()
  const currentTotalMinutes = nowHours * 60 + nowMinutes

  const [slotHours, slotMins] = slotTime.split(':').map(Number)
  const slotTotalMinutes = slotHours * 60 + slotMins

  const isCurrentActiveSlot =
    currentTotalMinutes >= slotTotalMinutes &&
    currentTotalMinutes < slotTotalMinutes + 45

  if (isCurrentActiveSlot) {
    return 'bg-red-600 text-white animate-pulse font-bold shadow-lg shadow-red-500/50'
  }

  if (currentTotalMinutes >= slotTotalMinutes) {
    if (type === 'C') {
      return 'bg-blue-950 text-blue-300 font-semibold border-blue-900/40'
    }
    if (type === 'P' || type === 'AD') {
      if (!slotItem.p && !slotItem.ad) return 'bg-transparent'
      if (Number(slotItem.ad) >= Number(slotItem.p) && Number(slotItem.p) > 0) {
        return 'bg-emerald-600 text-white font-bold'
      } else if (Number(slotItem.p) > 0) {
        return 'bg-red-600 text-white font-bold'
      }
    }
    return 'bg-neutral-900/60'
  }

  if (type === 'C')  return 'text-cyan-400'
  if (type === 'P')  return 'text-blue-400'
  if (type === 'AD') return 'text-emerald-400'
  return 'bg-transparent'
}

const calculateTotal = (slots, key) =>
  slots.reduce((sum, item) => sum + (Number(item[key]) || 0), 0)

const fetchData = async () => {
  try {
    await store.fetchDetailPcsDaily()
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  fetchData()
  clockInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 30000)
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
})
</script>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.3; transform: scale(0.98); }
}
.animate-pulse {
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>