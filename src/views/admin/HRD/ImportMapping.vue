<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue'

const page = ref({ title: 'Import Mapping Jadwal Shift' })
const breadcrumbs = ref([
  { title: 'HRD', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'Import Mapping', disabled: true, href: '#' },
])

interface FileEntry {
  id: number
  file: File
  department: string
  bulan: number
  tahun: number
  status: 'idle' | 'uploading' | 'success' | 'error'
  message: string
}

const fileEntries = ref<FileEntry[]>([])
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const isSubmittingAll = ref(false)
const globalResult = ref<{ total: number; success: number; failed: number } | null>(null)

const months = [
  { value: 1, text: 'Januari' },
  { value: 2, text: 'Februari' },
  { value: 3, text: 'Maret' },
  { value: 4, text: 'April' },
  { value: 5, text: 'Mei' },
  { value: 6, text: 'Juni' },
  { value: 7, text: 'Juli' },
  { value: 8, text: 'Agustus' },
  { value: 9, text: 'September' },
  { value: 10, text: 'Oktober' },
  { value: 11, text: 'November' },
  { value: 12, text: 'Desember' },
]

const departments = [
  'All Departments',
  'IT',
  'HR',
  'Finance',
  'Marketing',
  'Engineering',
  'Maintenance',
  'Quality Control',
  'PPIC',
  'Logistik',
  'Stamping',
  'Welding',
  'Assembly',
  'PCD',
]

const currentMonth = new Date().getMonth() + 1
const currentYear = new Date().getFullYear()

// Bersihkan token dari tanda kutip atau spasi liar
const rawToken =
  import.meta.env.VITE_FINGER_TOKEN ||
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NzEyMzI3ODksImRhdGEiOnsiaWQiOiI3IiwiZW1haWwiOiJhcGlAZ21haWwuY29tIiwibmFtZSI6IiJ9fQ.bmAQ8Qw4R-eNo0Yq2WqZ8-jBEIvIwkRwzr79mJSGYWU'
const FINGER_TOKEN = rawToken.replace(/^['"]|['"]$/g, '').trim()

// Gunakan proxy Vite '/finger-api' saat development untuk menghindari masalah CORS/OPTIONS
const UPLOAD_ENDPOINT = import.meta.env.DEV
  ? '/finger-api/api/v1/attendance/import/mapping'
  : 'http://192.168.10.8/maj-finger-api/api/v1/attendance/import/mapping'

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  if (e.dataTransfer?.files) {
    addFiles(e.dataTransfer.files)
  }
}

function onFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    addFiles(target.files)
    target.value = ''
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

function addFiles(files: FileList) {
  globalResult.value = null
  Array.from(files).forEach((file) => {
    if (!/\.(xlsx|xls)$/i.test(file.name)) return
    fileEntries.value.push({
      id: Date.now() + Math.random(),
      file,
      department: '',
      bulan: currentMonth,
      tahun: currentYear,
      status: 'idle',
      message: '',
    })
  })
}

function removeFile(index: number) {
  fileEntries.value.splice(index, 1)
  if (fileEntries.value.length === 0) {
    globalResult.value = null
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  else return (bytes / 1048576).toFixed(2) + ' MB'
}

async function uploadSingle(entry: FileEntry): Promise<boolean> {
  if (!entry.department) {
    entry.status = 'error'
    entry.message = 'Departemen wajib diisi!'
    return false
  }

  entry.status = 'uploading'
  entry.message = 'Sedang mengunggah dan memproses mapping...'

  const formData = new FormData()
  formData.append('file', entry.file)
  formData.append('department', entry.department.trim())
  formData.append('bulan', String(entry.bulan))
  formData.append('tahun', String(entry.tahun))

  try {
    const res = await fetch(UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${FINGER_TOKEN}`,
        // Jangan set 'Content-Type' manual agar browser otomatis mengisi boundary multipart
      },
      body: formData,
    })

    const data = await res.json().catch(() => ({}))

    if (res.ok && (data.status === 'success' || data.success || res.status === 200)) {
      entry.status = 'success'
      entry.message = data.message || 'Berhasil mengimpor mapping shift!'
      return true
    } else {
      entry.status = 'error'
      entry.message = data.message || `Gagal impor (HTTP ${res.status})`
      return false
    }
  } catch (err: any) {
    // Jika endpoint proxy gagal, coba fallback langsung
    try {
      const fallbackUrl = 'http://192.168.10.8/maj-finger-api/api/v1/attendance/import/mapping'
      const res = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${FINGER_TOKEN}`,
        },
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        entry.status = 'success'
        entry.message = data.message || 'Berhasil mengimpor mapping shift!'
        return true
      }
    } catch {
      // ignore fallback error
    }

    entry.status = 'error'
    entry.message = err?.message || 'Gagal terhubung ke server API'
    return false
  }
}

async function uploadAllFiles() {
  if (fileEntries.value.length === 0) return
  isSubmittingAll.value = true
  globalResult.value = null

  let success = 0
  let failed = 0

  for (const entry of fileEntries.value) {
    if (entry.status !== 'success') {
      const ok = await uploadSingle(entry)
      if (ok) success++
      else failed++
    } else {
      success++
    }
  }

  globalResult.value = {
    total: fileEntries.value.length,
    success,
    failed,
  }

  isSubmittingAll.value = false
}

const canSubmit = computed(() => {
  return fileEntries.value.length > 0 && !isSubmittingAll.value
})
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />

    <!-- Info Banner -->
    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-semibold text-blue-800">Petunjuk Import Mapping Shift</h3>
          <p class="text-xs text-blue-700 mt-1 leading-relaxed">
            Unggah file Excel jadwal kerja bulanan per departemen. Format file harus memiliki kolom NIK/ID Finger dan jadwal shift tanggal 1 s/d akhir bulan. Sistem akan otomatis memetakan jadwal dengan log absensi fingerprint.
          </p>
        </div>
      </div>
    </div>

    <!-- Drag & Drop Zone -->
    <div
      :class="[
        'relative border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer p-8 sm:p-12 text-center bg-white shadow-sm',
        isDragging ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50/50'
      ]"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="triggerFileInput"
    >
      <input
        ref="fileInput"
        type="file"
        multiple
        accept=".xlsx,.xls"
        class="hidden"
        @change="onFileSelect"
      />
      <div class="flex flex-col items-center gap-3">
        <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <p class="text-base font-semibold text-gray-800">
            Klik atau Tarik & Lepas file Excel di sini
          </p>
          <p class="text-xs text-gray-500 mt-1">
            Mendukung file <span class="font-medium text-gray-700">.xlsx</span>, <span class="font-medium text-gray-700">.xls</span> (Dapat memilih lebih dari 1 file)
          </p>
        </div>
      </div>
    </div>

    <!-- File Cards List -->
    <div v-if="fileEntries.length > 0" class="space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-base font-semibold text-gray-800">
          Daftar File yang Dipilih ({{ fileEntries.length }})
        </h2>
        <button
          @click="fileEntries = []"
          class="text-xs text-red-600 hover:text-red-800 font-medium hover:underline"
        >
          Hapus Semua
        </button>
      </div>

      <div
        v-for="(entry, index) in fileEntries"
        :key="entry.id"
        class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-200"
      >
        <!-- Header File Card -->
        <div class="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="truncate">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ entry.file.name }}</p>
              <p class="text-xs text-gray-500">{{ formatFileSize(entry.file.size) }}</p>
            </div>
          </div>
          <button
            @click="removeFile(index)"
            class="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
            title="Hapus file"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form Inputs per file -->
        <div class="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">
              Departemen <span class="text-red-500">*</span>
            </label>
            <input
              v-model="entry.department"
              list="dept-list"
              type="text"
              placeholder="Pilih atau ketik departemen"
              class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <datalist id="dept-list">
              <option v-for="d in departments" :key="d" :value="d" />
            </datalist>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">
              Bulan <span class="text-red-500">*</span>
            </label>
            <select
              v-model="entry.bulan"
              class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option v-for="m in months" :key="m.value" :value="m.value">
                {{ m.text }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">
              Tahun <span class="text-red-500">*</span>
            </label>
            <input
              v-model.number="entry.tahun"
              type="number"
              min="2000"
              max="2099"
              class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <!-- Status Message Banner -->
        <div
          v-if="entry.status !== 'idle'"
          :class="[
            'px-5 py-2.5 text-xs font-medium border-t flex items-center gap-2',
            entry.status === 'uploading' ? 'bg-blue-50 text-blue-700 border-blue-100' : '',
            entry.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : '',
            entry.status === 'error' ? 'bg-rose-50 text-rose-700 border-rose-100' : ''
          ]"
        >
          <span v-if="entry.status === 'uploading'" class="animate-spin text-blue-600">⌛</span>
          <span v-else-if="entry.status === 'success'" class="text-emerald-600 font-bold">✓</span>
          <span v-else-if="entry.status === 'error'" class="text-rose-600 font-bold">⚠</span>
          <span>{{ entry.message }}</span>
        </div>
      </div>

      <!-- Action Button -->
      <div class="pt-4 space-y-3">
        <button
          @click="uploadAllFiles"
          :disabled="!canSubmit"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg
            v-if="isSubmittingAll"
            class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>{{ isSubmittingAll ? 'Sedang Mengimpor File...' : `Import Semua (${fileEntries.length}) Jadwal Mapping` }}</span>
        </button>

        <!-- Global Result Summary -->
        <div
          v-if="globalResult"
          :class="[
            'p-4 rounded-xl text-xs font-semibold border',
            globalResult.failed === 0
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          ]"
        >
          {{ globalResult.success }} dari {{ globalResult.total }} file berhasil diimpor.
          <span v-if="globalResult.failed > 0" class="text-rose-600">
            ({{ globalResult.failed }} file gagal, periksa pesan error di atas)
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
