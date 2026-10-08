<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const isLiveClock = ref(true)
const customDate = ref('') // YYYY-MM-DD
const customTime = ref('') // HH:mm
const isExpanded = ref(true)

let timerId: any = null

const dateInputRef = ref<HTMLInputElement | null>(null)
const timeInputRef = ref<HTMLInputElement | null>(null)

const openDatePicker = () => {
  if (dateInputRef.value) {
    if (typeof dateInputRef.value.showPicker === 'function') {
      dateInputRef.value.showPicker()
    } else {
      dateInputRef.value.focus()
    }
  }
}

const openTimePicker = () => {
  if (timeInputRef.value) {
    if (typeof timeInputRef.value.showPicker === 'function') {
      timeInputRef.value.showPicker()
    } else {
      timeInputRef.value.focus()
    }
  }
}

const updateToNow = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  customDate.value = `${year}-${month}-${day}`
  customTime.value = `${hours}:${minutes}`
}

onMounted(() => {
  updateToNow()
  timerId = setInterval(() => {
    if (isLiveClock.value) {
      updateToNow()
    }
  }, 1000)
})

onUnmounted(() => {
  if (timerId) clearInterval(timerId)
})

const toggleLiveClock = () => {
  isLiveClock.value = !isLiveClock.value
  if (isLiveClock.value) {
    updateToNow()
  }
}

const onManualEdit = () => {
  isLiveClock.value = false
}

const resetToNow = () => {
  isLiveClock.value = true
  updateToNow()
}

// Greeting: jika jam < 15 => Selamat pagi, jika jam >= 15 => Selamat malam
const currentHour = computed(() => {
  if (!customTime.value) return 8
  const parts = customTime.value.split(':')
  return parseInt(parts[0], 10) || 0
})

const greeting = computed(() => {
  return currentHour.value < 15 ? 'Selamat pagi,' : 'Selamat malam,'
})

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const formattedDateStr = computed(() => {
  if (!customDate.value) return ''
  const parts = customDate.value.split('-')
  if (parts.length < 3) return ''
  const year = parts[0]
  const monthIdx = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  const monthName = INDONESIAN_MONTHS[monthIdx] || ''
  return `${day} ${monthName} ${year}`
})

const formattedTimeStr = computed(() => {
  if (!customTime.value) return ''
  return customTime.value
})

const fullFormattedStamp = computed(() => {
  return `${formattedDateStr.value} jam ${formattedTimeStr.value} WIB`
})

const currentMinutes = computed(() => {
  if (!customTime.value) return 8 * 60
  const parts = customTime.value.split(':')
  const h = parseInt(parts[0], 10) || 0
  const m = parseInt(parts[1], 10) || 0
  return h * 60 + m
})

const showSalesReport = computed(() => {
  const mins = currentMinutes.value
  // terhide jika jam > 15.59 (sore & malam)
  if (mins > 959) {
    return false
  }
  return true
})

const rundownIfpdText = computed(() => {
  const mins = currentMinutes.value
  if (mins > 959 && mins < 1081) {
    return `Selamat sore,\nBerikut Display Rundown IFPD per ${fullFormattedStamp.value}`
  } else if (mins > 1080) {
    return `Selamat malam,\nBerikut Display Rundown IFPD per ${fullFormattedStamp.value}`
  } else {
    return `Berikut Display Rundown IFPD per ${fullFormattedStamp.value}`
  }
})

const templates = computed(() => {
  const list = []

  if (showSalesReport.value) {
    list.push({
      id: 'sales_report',
      title: 'Display Report Sales',
      text: `${greeting.value}\nBerikut Display Report Sales per ${fullFormattedStamp.value}`
    })
  }

  list.push(
    {
      id: 'rundown_ifpd',
      title: 'Display Rundown IFPD',
      text: rundownIfpdText.value
    },
    {
      id: 'stock_min_16',
      title: 'Stock minimal 16 jam',
      titleClass: 'font-bold text-red-600',
      text: `Berikut Kebutuhan Qty Agar Stock Minimal 16 Jam. Update: ${fullFormattedStamp.value}`
    },
    {
      id: 'stock_over_20',
      title: 'Stock over 20 jam',
      titleClass: 'font-bold text-blue-600',
      text: `Berikut Stock Over agar kembali normal Maksimal 20 Jam. Update: ${fullFormattedStamp.value}\nTerima kasih🙏🏼🙏🏼`
    },
    {
      id: 'stock_over_mgl',
      title: 'Stock over item Magelang',
      titleClass: 'font-bold text-blue-600',
      text: `${greeting.value}\nBerikut kami kirimkan data Rundown Stock Over MGL-IFPD agar kembali normal Maksimal 20 Jam. Update: ${fullFormattedStamp.value}\nTerima kasih🙏🏼🙏🏼`
    },
    {
      id: 'min_16_mgl',
      title: 'Minimal 16 jam item Magelang',
      titleClass: 'font-bold text-red-600',
      text: `${greeting.value}\nBerikut kami kirimkan Kebutuhan Qty Agar Stock Minimal 16 Jam untuk item MGL-IFPD. Update: ${fullFormattedStamp.value}\nTerima kasih🙏🏼🙏🏼`
    },
    {
      id: 'planning_prioritas',
      title: 'Planning Prioritas',
      text: `Berikut Planning Prioritas Shift 2 Agar Stock Minimal 16 Jam.\nUpdate: ${fullFormattedStamp.value}\nTerima kasih🙏🏼🙏🏼`
    }
  )

  return list
})

const copiedId = ref<string | null>(null)
const toastMessage = ref('')
const showToast = ref(false)

const copyToClipboard = async (text: string): Promise<boolean> => {
  // Primary method: Modern Clipboard API (works on HTTPS or localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.warn('navigator.clipboard failed, attempting fallback:', err)
    }
  }

  // Fallback method: textarea + execCommand('copy') (works on HTTP server IP)
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.width = '2em'
    textArea.style.height = '2em'
    textArea.style.padding = '0'
    textArea.style.border = 'none'
    textArea.style.outline = 'none'
    textArea.style.boxShadow = 'none'
    textArea.style.background = 'transparent'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    return successful
  } catch (err) {
    console.error('Fallback copy failed: ', err)
    return false
  }
}

const handleCopy = async (item: { id: string; title: string; text: string }) => {
  const success = await copyToClipboard(item.text)
  if (success) {
    copiedId.value = item.id
    toastMessage.value = `Berhasil menyalin template "${item.title}"!`
    showToast.value = true

    setTimeout(() => {
      if (copiedId.value === item.id) {
        copiedId.value = null
      }
    }, 2000)

    setTimeout(() => {
      showToast.value = false
    }, 3000)
  } else {
    toastMessage.value = `Gagal menyalin template "${item.title}"!`
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 3000)
  }
}
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-5 transition-all">
    <!-- Header Controls -->
    <div class="bg-slate-800 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2.5">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
        <span class="font-bold text-xs tracking-wide">Format Keterangan Report Rundown Stock IFPD</span>
      </div>

      <div class="flex items-center gap-2 flex-wrap text-xs">
        <!-- Play / Stop Button -->
        <button
          @click="toggleLiveClock"
          type="button"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium text-[11px] transition-all shadow-sm cursor-pointer"
          :class="isLiveClock 
            ? 'bg-rose-600 hover:bg-rose-700 text-white' 
            : 'bg-emerald-600 hover:bg-emerald-700 text-white'"
        >
          <svg v-if="isLiveClock" class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
          <svg v-else class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <span>{{ isLiveClock ? 'Stop Waktu (Pause)' : 'Mulai Live Waktu' }}</span>
        </button>

        <!-- Manual Date Input -->
        <div class="flex items-center gap-1.5 bg-slate-700/80 px-2 py-0.5 rounded-md border border-slate-600">
          <label class="text-slate-300 text-[10px] font-medium">Tanggal:</label>
          <div class="relative flex items-center">
            <input 
              ref="dateInputRef"
              type="date"
              v-model="customDate"
              @change="onManualEdit"
              @input="onManualEdit"
              class="bg-slate-900 text-white [color-scheme:dark] text-[11px] pl-2 pr-7 py-0.5 rounded border border-slate-600 focus:outline-none focus:border-blue-400 cursor-pointer"
            />
            <button 
              type="button"
              @click="openDatePicker"
              class="absolute right-1.5 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer flex items-center justify-center"
              title="Pilih Tanggal"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Manual Time Input -->
        <div class="flex items-center gap-1.5 bg-slate-700/80 px-2 py-0.5 rounded-md border border-slate-600">
          <label class="text-slate-300 text-[10px] font-medium">Jam:</label>
          <div class="relative flex items-center">
            <input 
              ref="timeInputRef"
              type="time"
              v-model="customTime"
              @change="onManualEdit"
              @input="onManualEdit"
              class="bg-slate-900 text-white [color-scheme:dark] text-[11px] pl-2 pr-7 py-0.5 rounded border border-slate-600 focus:outline-none focus:border-blue-400 cursor-pointer"
            />
            <button 
              type="button"
              @click="openTimePicker"
              class="absolute right-1.5 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer flex items-center justify-center"
              title="Pilih Jam"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Reset to Now Button -->
        <button
          @click="resetToNow"
          type="button"
          title="Reset ke waktu sekarang"
          class="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] rounded-md transition-colors cursor-pointer border border-slate-600"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Sekarang</span>
        </button>

        <!-- Toggle Collapse/Expand Button -->
        <button
          @click="isExpanded = !isExpanded"
          type="button"
          class="p-0.5 text-slate-300 hover:text-white rounded transition-colors ml-0.5"
        >
          <svg class="w-4 h-4 transform transition-transform" :class="{ 'rotate-180': !isExpanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Collapsible Content -->
    <div v-show="isExpanded" class="p-4 bg-slate-50 border-t border-slate-200">
      <div class="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
              <th class="px-4 py-2.5 w-[22%] border-r border-slate-200">Jenis Broadcast</th>
              <th class="px-4 py-2.5 w-[66%] border-r border-slate-200">Template Pesan</th>
              <th class="px-4 py-2.5 w-[12%] text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 text-slate-800 font-sans">
            <tr 
              v-for="item in templates" 
              :key="item.id"
              class="hover:bg-blue-50/40 transition-colors"
            >
              <!-- Label / Title -->
              <td 
                class="px-4 py-3 align-top border-r border-slate-200 bg-slate-50/50"
                :class="item.titleClass || 'font-semibold text-slate-900'"
              >
                {{ item.title }}
              </td>

              <!-- Message Preview -->
              <td class="px-4 py-3 align-top border-r border-slate-200 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-slate-800">
                {{ item.text }}
              </td>

              <!-- Copy Action Button -->
              <td class="px-3 py-3 align-middle text-center">
                <button
                  @click="handleCopy(item)"
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all shadow-sm cursor-pointer w-full"
                  :class="copiedId === item.id 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'"
                >
                  <svg v-if="copiedId === item.id" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>{{ copiedId === item.id ? 'Tersalin' : 'Copy' }}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Toast Notification -->
    <transition enter-active-class="transition duration-300 ease-out" enter-from-class="transform translate-y-2 opacity-0" enter-to-class="transform translate-y-0 opacity-100" leave-active-class="transition duration-200 ease-in" leave-from-class="transform translate-y-0 opacity-100" leave-to-class="transform translate-y-2 opacity-0">
      <div v-if="showToast" class="fixed bottom-6 right-6 z-[99999] bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 border border-slate-700">
        <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm font-medium">{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<style scoped>
input[type="time"]::-webkit-calendar-picker-indicator,
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
  opacity: 0.9;
}
input[type="time"]::-webkit-calendar-picker-indicator:hover,
input[type="date"]::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}
</style>
