import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  fetchAttendanceData,
  fetchDepartmentList,
  type AttendanceFilter,
  type MappedRecord,
  type UnmappedRecord,
  type AttendanceStats,
} from '@/services/HRD/AttendanceService'

export const useAttendanceStore = defineStore('attendance', () => {
  const loading    = ref(false)
  const error      = ref<string | null>(null)

  const dataMapping   = ref<MappedRecord[]>([])
  const dataUnmapped  = ref<UnmappedRecord[]>([])
  const stats         = ref<AttendanceStats>({
    total: 0, hadir: 0, terlambat: 0,
    tidak_hadir: 0, izin: 0, sakit: 0,
    belum_absen: 0, lembur:0, shifts: [],
  })

  const departmentList = ref<string[]>([])
  const lastFilter     = ref<AttendanceFilter>({})

  async function fetchDataMapping(filter: AttendanceFilter = {}) {
    loading.value    = true
    error.value      = null
    lastFilter.value = { ...filter }

    try {
      const result      = await fetchAttendanceData(filter)
      dataMapping.value  = result.mapped
      dataUnmapped.value = result.unmapped
      stats.value        = result.stats
    } catch (err: any) {
      error.value = err?.message ?? 'Gagal mengambil data kehadiran'
      console.error('[AttendanceStore] fetchDataMapping:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchStats(filter: AttendanceFilter = {}) {
    const today = new Date().toISOString().slice(0, 10)
    await fetchDataMapping({ tanggal_start: today, tanggal_end: today, ...filter })
  }

  async function loadDepartmentList() {
    if (departmentList.value.length) return
    try {
      departmentList.value = await fetchDepartmentList()
    } catch (err) {
      console.error('[AttendanceStore] loadDepartmentList:', err)
    }
  }

  async function refetch() {
    await fetchDataMapping(lastFilter.value)
  }

  function reset() {
    loading.value      = false
    error.value        = null
    dataMapping.value  = []
    dataUnmapped.value = []
    stats.value        = {
      total: 0, hadir: 0, terlambat: 0,
      tidak_hadir: 0, izin: 0, sakit: 0,
      belum_absen: 0,lembur:0, shifts: [],
    }
  }

  return {
    loading, error,
    dataMapping, dataUnmapped, stats,
    departmentList, lastFilter,
    fetchDataMapping, fetchStats,
    loadDepartmentList, refetch, reset,
  }
})