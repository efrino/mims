<script setup lang="ts">
import { ref, shallowRef, onMounted, watch, computed } from 'vue'
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue'
import { storeToRefs } from 'pinia'
import { useMonitoringStore } from '@/stores/Logistik/WIP/Transaction/Monitoring'
import type { MonitoringItem, MasterDataForm, UploadDataItem } from '@/types/Logistik/WIP/Transaction/Monitoring'
import * as XLSX from 'xlsx'
import { useNotificationStore } from '@/stores/notification'

const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0')
const currentYear = String(new Date().getFullYear())

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const notificationStore = useNotificationStore()
const page = ref({ title: 'Monitoring PRESS' })
const breadcrumbs = shallowRef([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'WIP', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'Monitoring', disabled: true, href: '#' }
])

const monitoringStore = useMonitoringStore()
const { items, error, filterDate } = storeToRefs(monitoringStore)

const dialog = ref({ upload: false, edit: false })
const selectedType = ref('')
const excelInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const parsedData = ref<UploadDataItem[]>([])
const saveDate = ref('')
const isLoading = ref(false)
const isSyncing = ref(false)
const searchPartNumber = ref('')
const isSaving = ref(false)
const uploadMonth = ref(currentMonth)
const uploadYear = ref(currentYear)

const formMaster = ref<MasterDataForm>({
  part_number: '',
  job_number: '',
  part_finish: '',
  line_id: '',
  stock_awal: '',
  part_name: ''
})

filterDate.value.month = currentMonth
filterDate.value.year = currentYear

const pageTitle = computed(() => {
  const monthIndex = parseInt(filterDate.value.month) - 1
  const monthName = monthNames[monthIndex] || ''
  return `Monitoring PRESS Bulan ${monthName} ${filterDate.value.year}`
})

const formattedPeriod = computed(() => {
  const monthIndex = parseInt(filterDate.value.month) - 1
  const monthName = monthNames[monthIndex] || ''
  return `${monthName} ${filterDate.value.year}`
})

const filteredItems = computed(() => {
  if (!searchPartNumber.value.trim()) {
    return items.value
  }
  return items.value.filter(item => 
    item.part_number.toLowerCase().includes(searchPartNumber.value.toLowerCase())
  )
})

const formattedUploadPeriod = computed(() => {
  const monthIndex = parseInt(uploadMonth.value) - 1
  const monthName = monthNames[monthIndex] || ''
  return `${monthName} ${uploadYear.value}`
})

watch(() => [filterDate.value.month, filterDate.value.year], async () => {
  page.value.title = pageTitle.value
  await fetchMonitoringData()
})

onMounted(async () => {
  page.value.title = pageTitle.value
  saveDate.value = `${currentYear}-${currentMonth}`
  await fetchMonitoringData()
})

const fetchMonitoringData = async () => {
  await monitoringStore.fetchMonitoringData()
}

const syncData = async () => {
  isSyncing.value = true
  await fetchMonitoringData()
  isSyncing.value = false
}

const calculateStock = (index: number, item: MonitoringItem, type: 'LH' | 'RH'): number => {
  return monitoringStore.calculateStock(index, item, type)
}

const calculateMdfoAverage = (item: MonitoringItem): number => {
  return monitoringStore.calculateMdfoAverage(item)
}

const formatNumberOneDecimal = (value: number): string => {
  if (Math.abs(value) < 0.01) return '0'
  return value.toFixed(1)
}

const parseExcelFile = async (file: File): Promise<UploadDataItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          defval: '',
          raw: false 
        })
        
        resolve(jsonData as UploadDataItem[])
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsBinaryString(file)
  })
}

const openFile = (type: string) => {
  selectedType.value = type
  if (excelInput.value) {
    excelInput.value.accept = '.xlsx,.xls,.csv'
    excelInput.value.click()
  }
  
  const handleFileUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement
    if (input.files?.[0]) {
      selectedFile.value = input.files[0]
      
      isLoading.value = true
      try {
        parsedData.value = await parseExcelFile(input.files[0])
      } catch (error) {
        notificationStore.showDialogWarning('Gagal Membaca File', 'Pastikan format file Excel benar dan sesuai dengan template yang tersedia.')
        selectedFile.value = null
        parsedData.value = []
      } finally {
        isLoading.value = false
      }
      input.value = ''
    }
  }
  
  if (excelInput.value) {
    excelInput.value.onchange = handleFileUpload
  }
}

const setTypeData = (type: string) => {
  selectedType.value = type
  openFile(type)
}

const removeFile = () => {
  selectedFile.value = null
  parsedData.value = []
}

const saveFile = async () => {
  isLoading.value = true
  try {
    const uploadPeriod = `${uploadYear.value}-${uploadMonth.value.padStart(2,'0')}`
    const success = await monitoringStore.uploadData(selectedType.value, parsedData.value, uploadPeriod)
    if (success) {
      dialog.value.upload = false
      selectedFile.value = null
      selectedType.value = ''
      parsedData.value = []
      uploadMonth.value = currentMonth
      uploadYear.value = currentYear
    }
  } catch (error) {
    notificationStore.showDialogWarning('Gagal Mengupload File', 'Terjadi kesalahan saat mengupload file. Silakan coba lagi.')
  } finally {
    isLoading.value = false
  }
}

const getFileIcon = (fileName: string) => {
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return '📊'
  if (fileName.endsWith('.csv')) return '📋'
  return '📁'
}

const formatFileSize = (size: number) => {
  return `${(size / 1024).toFixed(1)} KB`
}

const openEditDialog = (item: MonitoringItem) => {
  formMaster.value = {
    part_number: item.part_number || '',
    job_number: item.job_number || '',
    part_finish: item.part_finish || '',
    line_id: item.line_id || '',
    stock_awal: item.stock_awal || '0',
    part_name: item.part_name || ''
  }
  
  dialog.value.edit = true
}

const resetEditForm = () => {
  formMaster.value = {
    part_number: '',
    job_number: '',
    part_finish: '',
    line_id: '',
    stock_awal: '',
    part_name: ''
  }
  dialog.value.edit = false
}

const onUpdate = async () => {
  isSaving.value = true
  
  try {
    const success = await monitoringStore.updateMasterData(formMaster.value)
    
    if (success) {
      resetEditForm()
    }
  } catch (error) {
    notificationStore.showDialogWarning('Gagal Memperbarui Data', 'Terjadi kesalahan saat memperbarui data. Silakan coba lagi.')
  } finally {
    isSaving.value = false
  }
}
</script>
  <template>
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />
    
    <div v-if="error" class="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-center gap-2 text-red-700">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        <span class="font-medium">Error: {{ error }}</span>
      </div>
      <button @click="fetchMonitoringData" class="mt-2 text-sm text-red-600 hover:text-red-800">
        Coba lagi
      </button>
    </div>
    
    <div class="flex flex-wrap items-center gap-3 mb-5 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <form class="flex">
        <select v-model="filterDate.month" class="bg-gray-50 min-w-[130px] border border-gray-200 text-gray-900 text-sm rounded-s-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
          <option value="" disabled>Pilih Bulan</option>
          <option v-for="(month, index) in monthNames" :value="String(index + 1).padStart(2, '0')">{{ month }}</option>
        </select>

        <select v-model="filterDate.year" class="bg-gray-50 min-w-[130px] border border-gray-200 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
          <option value="" disabled>Pilih Tahun</option>
          <option v-for="i in 5" :value="String(new Date().getFullYear() - (i - 1))">
            {{ new Date().getFullYear() - (i - 1) }}
          </option>
        </select>

        <button @click="syncData" type="button" class="flex w-full items-center gap-2 whitespace-nowrap text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-e-full text-sm px-3 py-2.5 relative" :disabled="isSyncing">
          <svg v-if="!isSyncing" class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4" />
          </svg>
          <svg v-else class="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSyncing ? 'Menyinkronkan...' : 'Sync Data' }}
        </button>
      </form>

      <div class="relative">
        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
          </svg>
        </div>
        <input
          v-model="searchPartNumber"
          type="text"
          class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-full focus:ring-blue-500 focus:border-blue-500 block w-[200px] pl-10 p-2.5"
          placeholder="Cari Part Number"
        >
      </div>

      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-9 9-5-5" />
        </svg>
        {{ filteredItems.length }} Part{{ filteredItems.length === 1 ? '' : 's' }}
      </span>

      <button @click="dialog.upload = true" class="ml-auto flex items-center gap-2 text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5">
        <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M12 4v12m0-12 4 4m-4-4L8 8" />
        </svg>
        Upload Data
      </button>
    </div>

    <input ref="excelInput" type="file" class="hidden" accept=".xlsx,.xls,.csv" />

    <div class="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
      <table class="w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-green-50">
          <tr>
            <th rowspan="3" class="px-4 py-3 text-center font-bold border w-[80px]">Action</th>
            <th rowspan="3" class="px-4 py-3 text-center font-bold border w-[70px]">NO</th>
            <th rowspan="3" class="px-4 py-3 text-center font-bold border w-[120px] sticky left-0 bg-green-50 z-10">PART NO</th>
            <th rowspan="3" class="px-4 py-3 text-center font-bold border w-[100px]">JOB NO</th>
            <th rowspan="3" class="px-4 py-3 text-center font-bold border w-[120px]">PART FINISH</th>
            <th rowspan="3" class="px-4 py-3 text-center font-bold border w-[80px]">LINE</th>
            <th rowspan="3" class="px-4 py-3 text-center font-bold border w-[120px]">CUSTOMER</th>
            <th rowspan="3" class="px-4 py-3 text-center font-bold border w-[100px]">STOCK AWAL</th>
            <th rowspan="3" class="px-4 py-3 text-center font-bold border w-[100px]">PATAN</th>
            <th rowspan="3" class="px-4 py-3 text-center font-bold border w-[150px]">LOTSIZE & LOTCYCLE</th>
            <th rowspan="3" class="px-4 py-3 text-center font-bold border w-[150px]"></th>
            <th :colspan="62" class="px-4 py-3 text-center font-bold border">TANGGAL</th>
          </tr>
          <tr>
            <template v-for="day in 31" :key="day">
              <th :colspan="2" class="px-2 py-2 text-center font-medium border">{{ day }}</th>
            </template>
          </tr>
          <tr>
            <template v-for="day in 31" :key="day">
              <th class="px-1 py-2 text-center font-normal border bg-gray-100 w-[40px]">D</th>
              <th class="px-1 py-2 text-center font-normal border bg-gray-100 w-[40px]">N</th>
            </template>
          </tr>
        </thead>
        
        <tbody v-if="filteredItems.length > 0">
          <template v-for="(item, index) in filteredItems" :key="item.part_number">
            <tr class="hover:bg-gray-50">
              <td rowspan="8" class="px-4 py-3 text-center border">
                <button 
                  @click="openEditDialog(item)" 
                  class="p-1 text-green-600 hover:text-green-800 transition-colors"
                  title="Edit Master Data"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                  </svg>
                </button>
              </td>
              <td rowspan="8" class="px-4 py-3 text-center border">{{ index + 1 }}</td>
              <td rowspan="8" class="px-4 py-3 border sticky left-0 bg-white font-medium">{{ item.part_number }}</td>
              <td rowspan="8" class="px-4 py-3 text-center border">{{ item.job_number }}</td>
              <td rowspan="8" class="px-4 py-3 text-center border">{{ item.part_finish || '-' }}</td>
              <td rowspan="8" class="px-4 py-3 text-center border">{{ item.line_id }}</td>
              <td rowspan="8" class="px-4 py-3 text-center border">-</td>
              <td rowspan="8" class="px-4 py-3 text-center border">{{ item.stock_awal || '0' }}</td>
              <td rowspan="8" class="px-4 py-3 text-center border">-</td>
              <td rowspan="8" class="px-4 py-3 text-center border">-</td>
              <td class="px-2 py-2 text-center border font-medium bg-blue-50">MDFO</td>
              <template v-for="day in 31" :key="`mdfo-${day}`">
                <td :colspan="2" class="px-2 py-2 text-center border font-medium bg-blue-50">
                  {{ item.mdfo[`mdfo_${String(day).padStart(2, '0')}`] || '0' }}
                </td>
              </template>
            </tr>
            
            <tr class="hover:bg-gray-50">
              <td class="px-2 py-2 text-center border font-medium bg-green-50">DN</td>
              <template v-for="day in 31" :key="`dn-${day}`">
                <td :colspan="2" class="px-2 py-2 text-center border font-medium bg-green-50">
                  {{ item.dn[`dn_${String(day).padStart(2, '0')}`] || '0' }}
                </td>
              </template>
            </tr>
            
            <tr class="hover:bg-gray-50">
              <td class="px-2 py-2 text-center border font-medium bg-yellow-50">Prod. Welding</td>
              <template v-for="day in 31" :key="`wld-${day}`">
                <td class="px-1 py-2 text-center border font-medium bg-yellow-50">
                  {{ item.prod_welding[`prod_welding_${String(day).padStart(2, '0')}_d`] || '0' }}
                </td>
                <td class="px-1 py-2 text-center border font-medium bg-yellow-50">
                  {{ item.prod_welding[`prod_welding_${String(day).padStart(2, '0')}_n`] || '0' }}
                </td>
              </template>
            </tr>
            
            <tr class="hover:bg-gray-50">
              <td class="px-2 py-2 text-center border font-medium bg-purple-50">Planning PRESS</td>
              <template v-if="item.type_part === 'RH'">
                <template v-for="day in 31" :key="`plan-rh-${day}`">
                  <td class="px-1 py-2 text-center border font-medium bg-purple-50">
                    {{ item.lot_rh[`lot_rh_${String(day).padStart(2, '0')}_1`] || '0' }}
                  </td>
                  <td class="px-1 py-2 text-center border font-medium bg-purple-50">
                    {{ item.lot_rh[`lot_rh_${String(day).padStart(2, '0')}_2`] || '0' }}
                  </td>
                </template>
              </template>
              <template v-if="item.type_part === 'LH'">
                <template v-for="day in 31" :key="`plan-lh-${day}`">
                  <td class="px-1 py-2 text-center border font-medium bg-purple-50">
                    {{ item.lot_lh[`lot_lh_${String(day).padStart(2, '0')}_1`] || '0' }}
                  </td>
                  <td class="px-1 py-2 text-center border font-medium bg-purple-50">
                    {{ item.lot_lh[`lot_lh_${String(day).padStart(2, '0')}_2`] || '0' }}
                  </td>
                </template>
              </template>
            </tr>
            
            <tr class="hover:bg-gray-50">
              <td class="px-2 py-2 text-center border font-medium bg-indigo-50">Actual Produksi</td>
              <template v-if="item.type_part === 'RH'">
                <template v-for="day in 31" :key="`act-rh-${day}`">
                  <td class="px-1 py-2 text-center border font-medium bg-indigo-50">
                    {{ item.act_rh[`act_rh_${String(day).padStart(2, '0')}_1`] || '0' }}
                  </td>
                  <td class="px-1 py-2 text-center border font-medium bg-indigo-50">
                    {{ item.act_rh[`act_rh_${String(day).padStart(2, '0')}_2`] || '0' }}
                  </td>
                </template>
              </template>
              <template v-if="item.type_part === 'LH'">
                <template v-for="day in 31" :key="`act-lh-${day}`">
                  <td class="px-1 py-2 text-center border font-medium bg-indigo-50">
                    {{ item.act_lh[`act_lh_${String(day).padStart(2, '0')}_1`] || '0' }}
                  </td>
                  <td class="px-1 py-2 text-center border font-medium bg-indigo-50">
                    {{ item.act_lh[`act_lh_${String(day).padStart(2, '0')}_2`] || '0' }}
                  </td>
                </template>
              </template>
            </tr>
            
            <tr class="hover:bg-gray-50">
              <td class="px-2 py-2 text-center border font-medium bg-pink-50">Balance</td>
              <template v-if="item.type_part === 'RH'">
                <template v-for="day in 31" :key="`bal-rh-${day}`">
                  <td class="px-1 py-2 text-center border font-medium bg-pink-50">
                    {{ 
                      (parseInt(item.act_rh[`act_rh_${String(day).padStart(2, '0')}_1`] || '0') 
                      - parseInt(item.lot_rh[`lot_rh_${String(day).padStart(2, '0')}_1`] || '0')) 
                    }}
                  </td>
                  <td class="px-1 py-2 text-center border font-medium bg-pink-50">
                    {{ 
                      (parseInt(item.act_rh[`act_rh_${String(day).padStart(2, '0')}_2`] || '0') 
                      - parseInt(item.lot_rh[`lot_rh_${String(day).padStart(2, '0')}_2`] || '0')) 
                    }}
                  </td>
                </template>
              </template>
              <template v-if="item.type_part === 'LH'">
                <template v-for="day in 31" :key="`bal-lh-${day}`">
                  <td class="px-1 py-2 text-center border font-medium bg-pink-50">
                    {{ 
                      (parseInt(item.act_lh[`act_lh_${String(day).padStart(2, '0')}_1`] || '0') 
                      - parseInt(item.lot_lh[`lot_lh_${String(day).padStart(2, '0')}_1`] || '0')) 
                    }}
                  </td>
                  <td class="px-1 py-2 text-center border font-medium bg-pink-50">
                    {{ 
                      (parseInt(item.act_lh[`act_lh_${String(day).padStart(2, '0')}_2`] || '0') 
                      - parseInt(item.lot_lh[`lot_lh_${String(day).padStart(2, '0')}_2`] || '0')) 
                    }}
                  </td>
                </template>
              </template>
            </tr>
            
            <tr class="hover:bg-gray-50">
              <td class="px-2 py-2 text-center border font-medium bg-teal-50">Stock</td>
              <template v-if="item.type_part === 'RH'">
                <template v-for="day in 31" :key="`stock-rh-${day}`">
                  <td class="px-1 py-2 text-center border font-medium bg-teal-50">
                    {{ calculateStock((day-1)*2, item, 'RH') }}
                  </td>
                  <td class="px-1 py-2 text-center border font-medium bg-teal-50">
                    {{ calculateStock((day-1)*2+1, item, 'RH') }}
                  </td>
                </template>
              </template>
              <template v-if="item.type_part === 'LH'">
                <template v-for="day in 31" :key="`stock-lh-${day}`">
                  <td class="px-1 py-2 text-center border font-medium bg-teal-50">
                    {{ calculateStock((day-1)*2, item, 'LH') }}
                  </td>
                  <td class="px-1 py-2 text-center border font-medium bg-teal-50">
                    {{ calculateStock((day-1)*2+1, item, 'LH') }}
                  </td>
                </template>
              </template>
            </tr>
            
            <tr class="hover:bg-gray-50">
              <td class="px-2 py-2 text-center border font-medium bg-orange-50">Strength</td>
              <template v-if="item.type_part === 'RH'">
                <template v-for="day in 31" :key="`strength-rh-${day}`">
                  <td class="px-1 py-2 text-center border font-medium bg-orange-50" 
                      :class="{ 
                        'bg-red-100 text-red-700': calculateMdfoAverage(item) > 0 && 
                          (calculateStock((day-1)*2, item, 'RH') / calculateMdfoAverage(item)) < 1,
                        'bg-green-100 text-green-700': calculateMdfoAverage(item) > 0 && 
                          (calculateStock((day-1)*2, item, 'RH') / calculateMdfoAverage(item)) >= 1,
                        'bg-gray-100 text-gray-500': calculateMdfoAverage(item) <= 0
                      }">
                    {{ 
                      calculateMdfoAverage(item) > 0 
                        ? formatNumberOneDecimal(calculateStock((day-1)*2, item, 'RH') / calculateMdfoAverage(item))
                        : '0'
                    }}
                  </td>
                  <td class="px-1 py-2 text-center border font-medium bg-orange-50"
                      :class="{ 
                        'bg-red-100 text-red-700': calculateMdfoAverage(item) > 0 && 
                          (calculateStock((day-1)*2+1, item, 'RH') / calculateMdfoAverage(item)) < 1,
                        'bg-green-100 text-green-700': calculateMdfoAverage(item) > 0 && 
                          (calculateStock((day-1)*2+1, item, 'RH') / calculateMdfoAverage(item)) >= 1,
                        'bg-gray-100 text-gray-500': calculateMdfoAverage(item) <= 0
                      }">
                    {{ 
                      calculateMdfoAverage(item) > 0 
                        ? formatNumberOneDecimal(calculateStock((day-1)*2+1, item, 'RH') / calculateMdfoAverage(item))
                        : '0'
                    }}
                  </td>
                </template>
              </template>
              <template v-if="item.type_part === 'LH'">
                <template v-for="day in 31" :key="`strength-lh-${day}`">
                  <td class="px-1 py-2 text-center border font-medium bg-orange-50"
                      :class="{ 
                        'bg-red-100 text-red-700': calculateMdfoAverage(item) > 0 && 
                          (calculateStock((day-1)*2, item, 'LH') / calculateMdfoAverage(item)) < 1,
                        'bg-green-100 text-green-700': calculateMdfoAverage(item) > 0 && 
                          (calculateStock((day-1)*2, item, 'LH') / calculateMdfoAverage(item)) >= 1,
                        'bg-gray-100 text-gray-500': calculateMdfoAverage(item) <= 0
                      }">
                    {{ 
                      calculateMdfoAverage(item) > 0 
                        ? formatNumberOneDecimal(calculateStock((day-1)*2, item, 'LH') / calculateMdfoAverage(item))
                        : '0'
                    }}
                  </td>
                  <td class="px-1 py-2 text-center border font-medium bg-orange-50"
                      :class="{ 
                        'bg-red-100 text-red-700': calculateMdfoAverage(item) > 0 && 
                          (calculateStock((day-1)*2+1, item, 'LH') / calculateMdfoAverage(item)) < 1,
                        'bg-green-100 text-green-700': calculateMdfoAverage(item) > 0 && 
                          (calculateStock((day-1)*2+1, item, 'LH') / calculateMdfoAverage(item)) >= 1,
                        'bg-gray-100 text-gray-500': calculateMdfoAverage(item) <= 0
                      }">
                    {{ 
                      calculateMdfoAverage(item) > 0 
                        ? formatNumberOneDecimal(calculateStock((day-1)*2+1, item, 'LH') / calculateMdfoAverage(item))
                        : '0'
                    }}
                  </td>
                </template>
              </template>
            </tr>
          </template>
        </tbody>
        
        <tbody v-else>
          <tr>
            <td colspan="73" class="px-6 py-12 text-center text-gray-500">
              <div class="flex flex-col items-center justify-center">
                <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.801 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.801 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/>
                </svg>
                <p class="text-lg font-medium text-gray-600 mb-2">Tidak ada data ditemukan</p>
                <p class="text-gray-500 mb-4">
                  {{ searchPartNumber ? `Tidak ada part number yang cocok dengan "${searchPartNumber}"` : `Tidak ada data monitoring untuk periode ${formattedPeriod}` }}
                </p>
                <button @click="searchPartNumber ? searchPartNumber = '' : fetchMonitoringData()" class="text-blue-600 hover:text-blue-800 font-medium">
                  {{ searchPartNumber ? 'Reset pencarian' : 'Muat ulang data' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Upload Data -->
    <Transition name="modal-fade">
      <div v-if="dialog.upload" class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4" @click.self="dialog.upload = false">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col transform transition-all duration-300 modal-enter">
          <div class="p-4 border-b border-gray-200">
            <h2 class="text-lg font-bold text-gray-700">Pilih Jenis Data Untuk di Upload</h2>
          </div>
          
          <div class="p-6 flex-1 overflow-y-auto">
            <div v-if="!selectedFile" class="grid grid-cols-2 gap-4">
              <div class="cursor-pointer" @click="setTypeData('MDFO')">
                <div class="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-pink-200 bg-pink-50 hover:bg-pink-100 transition-all duration-200 h-full">
                  <svg class="w-12 h-12 text-pink-600 mb-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                  <div class="text-lg font-bold text-gray-800 text-center">Data MDFO</div>
                </div>
              </div>

              <div class="cursor-pointer" @click="setTypeData('DN')">
                <div class="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-all duration-200 h-full">
                  <svg class="w-12 h-12 text-green-600 mb-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                  </svg>
                  <div class="text-lg font-bold text-gray-800 text-center">Data DN</div>
                </div>
              </div>

              <div class="cursor-pointer" @click="setTypeData('Prod Welding')">
                <div class="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-all duration-200 h-full">
                  <svg class="w-12 h-12 text-yellow-600 mb-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41zM21 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
                  </svg>
                  <div class="text-lg font-bold text-gray-800 text-center">LKH Welding</div>
                </div>
              </div>

              <div class="cursor-pointer" @click="setTypeData('Stock Awal')">
                <div class="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-all duration-200 h-full">
                  <svg class="w-12 h-12 text-indigo-600 mb-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/>
                  </svg>
                  <div class="text-lg font-bold text-gray-800 text-center">Stock Awal</div>
                </div>
              </div>
            </div>

            <div v-if="selectedFile" class="space-y-6">
              <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">{{ getFileIcon(selectedFile.name) }}</span>
                    <div>
                      <h3 class="font-semibold text-gray-800">{{ selectedType }}</h3>
                      <p class="text-sm text-gray-600 mt-1">File yang dipilih:</p>
                    </div>
                  </div>
                  <button @click="removeFile" class="text-red-500 hover:text-red-700 p-1">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                  </button>
                </div>
                
                <div class="bg-white p-3 rounded border border-gray-200">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                      </svg>
                      <span class="text-sm font-medium text-gray-800 truncate">{{ selectedFile.name }}</span>
                    </div>
                    <span class="text-xs text-gray-500">{{ formatFileSize(selectedFile.size) }}</span>
                  </div>
                </div>
              </div>

              <div class="pt-4 border-t border-gray-200">
                  <div class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p class="text-sm font-medium text-blue-700 mb-3">Pilih periode penyimpanan data:</p>
                    <div class="flex gap-2">
                      <select 
                        v-model="uploadMonth" 
                        class="flex-1 bg-white border border-blue-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
                      >
                        <option v-for="(month, index) in monthNames" :key="index" :value="String(index + 1).padStart(2, '0')">
                          {{ month }}
                        </option>
                      </select>
                      <select 
                        v-model="uploadYear" 
                        class="w-[110px] bg-white border border-blue-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
                      >
                        <option v-for="i in 5" :key="i" :value="String(new Date().getFullYear() - (i - 1))">
                          {{ new Date().getFullYear() - (i - 1) }}
                        </option>
                      </select>
                    </div>
                    <p class="text-xs text-blue-600 mt-2">
                      Periode dipilih: <strong>{{ formattedUploadPeriod }}</strong>
                    </p>
                  </div>
                  
                  <button @click="saveFile" :disabled="isLoading" class="w-full flex items-center justify-center gap-2 text-white bg-green-500 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    <svg v-if="isLoading" class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ isLoading ? 'Menyimpan...' : 'Simpan Data' }}
                  </button>
                </div>
            </div>
          </div>

          <div class="p-4 border-t flex justify-between items-center">
            <button v-if="selectedFile" @click="selectedFile = null; selectedType = ''" class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium rounded-lg transition-colors duration-200 flex items-center gap-2">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
              </svg>
              Kembali
            </button>
            <div v-else></div>
            
            <button @click="dialog.upload = false" class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium rounded-lg transition-colors duration-200">
              {{ selectedFile ? 'Batal' : 'Tutup' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modal Edit Data -->
    <Transition name="modal-fade">
      <div v-if="dialog.edit" class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4" @click.self="dialog.edit = false">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all duration-300 modal-enter">
          <div class="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-white rounded-lg shadow-sm">
                  <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-gray-800">Edit Master Data {{ formMaster.part_number }}</h2>
                </div>
              </div>
              <button @click="resetEditForm" class="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="p-6 flex-1 overflow-y-auto">
            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="block text-sm font-medium text-gray-700">
                    Part Number <span class="text-red-500">*</span>
                  </label>
                  <input 
                    v-model="formMaster.part_number"
                    type="text" 
                    disabled
                    class="bg-gray-100 border border-gray-300 text-gray-700 text-sm rounded-lg cursor-not-allowed block w-full p-2.5"
                    placeholder="Part number (tidak dapat diubah)"
                  >
                </div>

                <div class="space-y-2">
                  <label class="block text-sm font-medium text-gray-700">
                    Stock Awal
                  </label>
                  <input 
                    v-model="formMaster.stock_awal"
                    type="number" 
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    placeholder="Masukkan stock awal"
                  >
                </div>

                <div class="space-y-2">
                  <label class="block text-sm font-medium text-gray-700">
                    Part Name
                  </label>
                  <input  
                    v-model="formMaster.part_name"
                    type="text" 
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    placeholder="Masukkan nama part"
                  >
                </div>

                <div class="space-y-2">
                  <label class="block text-sm font-medium text-gray-700">
                    Job Number <span class="text-red-500">*</span>
                  </label>
                  <input 
                    v-model="formMaster.job_number"
                    type="text" 
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    placeholder="Masukkan job number"
                    required
                  >
                </div>

                <div class="space-y-2">
                  <label class="block text-sm font-medium text-gray-700">
                    Line <span class="text-red-500">*</span>
                  </label>
                  <input 
                    v-model="formMaster.line_id"
                    type="text" 
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    placeholder="Masukkan line"
                    required
                  >
                </div>

                <div class="space-y-2">
                  <label class="block text-sm font-medium text-gray-700">
                    Part Finish
                  </label>
                  <input 
                    v-model="formMaster.part_finish"
                    type="text" 
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    placeholder="Masukkan part finish"
                  >
                </div>
              </div>
            </div>
          </div>

          <div class="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div class="flex flex-col sm:flex-row justify-end gap-3">
              <button 
                @click="resetEditForm" 
                :disabled="isSaving"
                class="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
                Batal
              </button>
              <button 
                @click="onUpdate"
                :disabled="isSaving"
                class="px-5 py-2.5 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg v-if="isSaving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                {{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </template>

  <style scoped>
  .border {
    border: 1px solid #e5e7eb !important;
  }

  .sticky {
    position: sticky;
    z-index: 20;
  }

  .sticky.left-0 {
    left: 0;
    box-shadow: 2px 0 4px rgba(0,0,0,0.1);
    background-color: white;
  }

  .modal-fade-enter-active,
  .modal-fade-leave-active {
    transition: opacity 0.3s ease;
  }

  .modal-fade-enter-from,
  .modal-fade-leave-to {
    opacity: 0;
  }

  .modal-fade-enter-active .modal-enter,
  .modal-fade-leave-active .modal-enter {
    transition: transform 0.3s ease;
  }

  .modal-fade-enter-from .modal-enter,
  .modal-fade-leave-to .modal-enter {
    transform: scale(0.95);
  }

  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
  }

  thead .sticky {
    background-color: #edf3ec !important; 
  }
  </style>