<script setup lang="ts">
import { ref, shallowRef, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue'
import { useQuotContractStore } from '@/stores/Marketing/QuotContractStore'
import { getWeeklyUnitData } from '@/services/Marketing/QuotContractService'
import { storeToRefs } from 'pinia'
import * as XLSX from 'xlsx'
import { useConfigStore } from '@/stores/config'
import axios from 'axios'

const page = ref({ title: 'Quotation-Contract Monitoring' })
const breadcrumbs = shallowRef([
  { title: 'Marketing', disabled: false, href: '#' },
  { title: 'Monthly', disabled: false, href: '#' },
  { title: 'Quotation-Contract', disabled: true, href: '#' },
])

const store = useQuotContractStore()
const {
    items,
    quotationSummary,
    quotationDetail,
    loading,
    error,
    permissions
} = storeToRefs(store)

const normalizedQuotationDetail = computed(() => {
  return (quotationDetail.value || []).map(item => {
    if (item.customer) {
      return {
        ...item,
        customer: item.customer.trim().toUpperCase()
      }
    }
    return item
  })
})

const normalizedQuotationSummary = computed(() => {
  return (quotationSummary.value || []).map(item => {
    if (item.ZCUST) {
      return {
        ...item,
        ZCUST: item.ZCUST.trim().toUpperCase()
      }
    }
    return item
  })
})

const MONTHS = [
  { text: 'Januari',   value: '01' },
  { text: 'Februari',  value: '02' },
  { text: 'Maret',     value: '03' },
  { text: 'April',     value: '04' },
  { text: 'Mei',       value: '05' },
  { text: 'Juni',      value: '06' },
  { text: 'Juli',      value: '07' },
  { text: 'Agustus',   value: '08' },
  { text: 'September', value: '09' },
  { text: 'Oktober',   value: '10' },
  { text: 'November',  value: '11' },
  { text: 'Desember',  value: '12' },
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i)
const currentMonthVal = String(new Date().getMonth() + 1).padStart(2, '0')

const filter = reactive({
  month: currentMonthVal,
  year: currentYear,
  search: '',
  perPage: '10', 
})

const isCurrentMonthSelected = computed(() => {
  return filter.month === currentMonthVal && String(filter.year) === String(currentYear)
})

const currentMode = ref<'contract' | 'quotation'>('contract')
const currentPage = ref(1)
const unitMonthStatuses = ref<any[]>([])

const contractCycle = ref<'monthly' | 'weekly'>('monthly')
const weeklyData = ref<any[]>([])
const weeklyWeekInfo = ref<Record<string, Record<string, string>>>({})

const prevPeriodString = computed(() => {
  const year = Number(filter.year)
  const monthIdx = Number(filter.month) - 1 // 1-based to 0-based
  const d = new Date(year, monthIdx, 1)
  d.setMonth(d.getMonth() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}${m}`
})

const getMonthKeterangan = (spmon: string) => {
  if (spmon < currentPeriodString.value) return 'Sales Order'
  if (spmon > currentPeriodString.value) return 'MDFO'
  return 'Sales Order / MDFO'
}

const prevKeterangan = computed(() => getMonthKeterangan(prevPeriodString.value))
const currKeterangan = computed(() => getMonthKeterangan(formattedPeriod.value))

const getWeekDateRange = (spmon: string, weekKey: string) => {
  if (weeklyWeekInfo.value && weeklyWeekInfo.value[spmon]) {
    const range = weeklyWeekInfo.value[spmon][weekKey]
    if (range && range !== '-') {
      return range
    }
  }
  return ''
}

const getWeekSource = (spmon: string, weekKey: string) => {
  if (spmon < currentPeriodString.value) return 'Sales Order'
  if (spmon > currentPeriodString.value) return 'MDFO'
  
  if (!weeklyWeekInfo.value || !weeklyWeekInfo.value[spmon]) return 'MDFO'
  const rangeStr = weeklyWeekInfo.value[spmon][weekKey]
  if (!rangeStr || rangeStr === '-') return 'MDFO'
  
  const matches = rangeStr.match(/\d+/g)
  if (!matches || matches.length < 2) return 'MDFO'
  const endDay = parseInt(matches[1], 10)
  
  const monthIdx = parseInt(spmon.slice(4), 10) - 1
  const year = parseInt(spmon.slice(0, 4), 10)
  
  const endOfWeekDate = new Date(year, monthIdx, endDay, 23, 59, 59)
  const today = new Date()
  
  return today > endOfWeekDate ? 'Sales Order' : 'MDFO'
}

const getWeekTooltip = (spmon: string, weekKey: string) => {
  const range = getWeekDateRange(spmon, weekKey)
  return range || ''
}

const getWeekHeaderClass = (spmon: string, weekKey: string) => {
  return 'bg-slate-700 text-white text-center py-2 transition-colors'
}

const getWeeklyRowPrevTotalMdfo = (item: any) => {
  if (!item.prev) return 0
  let sum = 0
  sum += Number(item.prev.w1_mdfo) || 0
  sum += Number(item.prev.w2_mdfo) || 0
  sum += Number(item.prev.w3_mdfo) || 0
  sum += Number(item.prev.w4_mdfo) || 0
  if (showW5Prev.value) sum += Number(item.prev.w5_mdfo) || 0
  if (showW6Prev.value) sum += Number(item.prev.w6_mdfo) || 0
  return sum
}

const getWeeklyRowPrevTotalSo = (item: any) => {
  if (!item.prev) return 0
  let sum = 0
  sum += Number(item.prev.w1_so) || 0
  sum += Number(item.prev.w2_so) || 0
  sum += Number(item.prev.w3_so) || 0
  sum += Number(item.prev.w4_so) || 0
  if (showW5Prev.value) sum += Number(item.prev.w5_so) || 0
  if (showW6Prev.value) sum += Number(item.prev.w6_so) || 0
  return sum
}

const getWeeklyRowCurrTotalMdfo = (item: any) => {
  if (!item.curr) return 0
  let sum = 0
  sum += Number(item.curr.w1_mdfo) || 0
  sum += Number(item.curr.w2_mdfo) || 0
  sum += Number(item.curr.w3_mdfo) || 0
  sum += Number(item.curr.w4_mdfo) || 0
  if (showW5Curr.value) sum += Number(item.curr.w5_mdfo) || 0
  if (showW6Curr.value) sum += Number(item.curr.w6_mdfo) || 0
  return sum
}

const getWeeklyRowCurrTotalSo = (item: any) => {
  if (!item.curr) return 0
  let sum = 0
  sum += Number(item.curr.w1_so) || 0
  sum += Number(item.curr.w2_so) || 0
  sum += Number(item.curr.w3_so) || 0
  sum += Number(item.curr.w4_so) || 0
  if (showW5Curr.value) sum += Number(item.curr.w5_so) || 0
  if (showW6Curr.value) sum += Number(item.curr.w6_so) || 0
  return sum
}

const getSoVsMdfoPercent = (mdfoVal: any, soVal: any) => {
  const mdfo = Number(mdfoVal) || 0
  const so = Number(soVal) || 0
  if (mdfo === 0) return ''
  const diff = so - mdfo
  const prs = diff / mdfo
  const percentVal = Math.round(prs * 100)
  const sign = percentVal > 0 ? '+' : ''
  return `${sign}${percentVal}%`
}

const getSoVsMdfoColorClass = (mdfoVal: any, soVal: any) => {
  const mdfo = Number(mdfoVal) || 0
  const so = Number(soVal) || 0
  const diff = so - mdfo
  if (diff > 0) return 'text-emerald-600'
  if (diff < 0) return 'text-rose-600'
  return 'text-gray-400'
}

const weeklyDataNormalized = computed(() => {
  const map: Record<string, any> = {}
  const prevSpmon = prevPeriodString.value
  const currSpmon = formattedPeriod.value

  weeklyData.value.forEach(item => {
    const customer = (item.customer || '').trim().toUpperCase()
    const matnr = (item.matnr || '').trim()
    const jobNumber = (item.job_number || '').trim()
    const project = (item.project || '').trim()
    const projectDetail = (item.project_detail || '').trim()
    
    // Combine project + project_detail if project_detail is not null
    let model = projectDetail 
      ? `${project} ${projectDetail}`.trim() 
      : project || jobNumber || matnr || '-'

    // Rename model to D37D for matnr containing 61024-BZ620-00-28
    if (matnr.includes('61024-BZ620-00-28')) {
      model = 'D37D'
    }
      
    const key = `${customer}_${matnr}_${jobNumber}_${project}_${projectDetail}`

    if (!map[key]) {
      map[key] = {
        customer,
        matnr,
        job_number: jobNumber,
        project,
        project_detail: projectDetail,
        model,
        MATNR1: item.matnr1 || '',
        BISMT1: item.job_number1 || '',
        prev: { 
          w1_mdfo: 0, w1_so: 0, 
          w2_mdfo: 0, w2_so: 0, 
          w3_mdfo: 0, w3_so: 0, 
          w4_mdfo: 0, w4_so: 0, 
          w5_mdfo: 0, w5_so: 0, 
          w6_mdfo: 0, w6_so: 0 
        },
        curr: { 
          w1_mdfo: 0, w1_so: 0, 
          w2_mdfo: 0, w2_so: 0, 
          w3_mdfo: 0, w3_so: 0, 
          w4_mdfo: 0, w4_so: 0, 
          w5_mdfo: 0, w5_so: 0, 
          w6_mdfo: 0, w6_so: 0 
        }
      }
    }

    if (item.matnr1) map[key].MATNR1 = item.matnr1
    if (item.job_number1) map[key].BISMT1 = item.job_number1

    const w1_mdfo = Number(item.w1_mdfo) || 0
    const w1_so   = Number(item.w1_so) || 0
    const w2_mdfo = Number(item.w2_mdfo) || 0
    const w2_so   = Number(item.w2_so) || 0
    const w3_mdfo = Number(item.w3_mdfo) || 0
    const w3_so   = Number(item.w3_so) || 0
    const w4_mdfo = Number(item.w4_mdfo) || 0
    const w4_so   = Number(item.w4_so) || 0
    const w5_mdfo = Number(item.w5_mdfo) || 0
    const w5_so   = Number(item.w5_so) || 0
    const w6_mdfo = Number(item.w6_mdfo) || 0
    const w6_so   = Number(item.w6_so) || 0

    if (item.spmon === prevSpmon) {
      map[key].prev = { 
        w1_mdfo, w1_so, 
        w2_mdfo, w2_so, 
        w3_mdfo, w3_so, 
        w4_mdfo, w4_so, 
        w5_mdfo, w5_so, 
        w6_mdfo, w6_so 
      }
    } else if (item.spmon === currSpmon) {
      map[key].curr = { 
        w1_mdfo, w1_so, 
        w2_mdfo, w2_so, 
        w3_mdfo, w3_so, 
        w4_mdfo, w4_so, 
        w5_mdfo, w5_so, 
        w6_mdfo, w6_so 
      }
    }
  })

  return Object.values(map)
})

const weeklyDataFiltered = computed(() => {
  let list = weeklyDataNormalized.value

  if (filter.search) {
    const q = filter.search.toLowerCase().trim()
    list = list.filter(item => (
      (item.customer && item.customer.toLowerCase().includes(q)) ||
      (item.model && item.model.toLowerCase().includes(q)) ||
      (item.matnr && item.matnr.toLowerCase().includes(q)) ||
      (item.job_number && item.job_number.toLowerCase().includes(q))
    ))
  }

  const hiddenCust = contractColumnFilters.ZCUST.hiddenValues
  if (hiddenCust.length > 0) {
    list = list.filter(item => !hiddenCust.includes(item.customer || '-'))
  }
  const hiddenModel = contractColumnFilters.ZMODEL.hiddenValues
  if (hiddenModel.length > 0) {
    list = list.filter(item => !hiddenModel.includes(item.model || '-'))
  }

  let activeSortCol = '', activeSortOrder: 'asc' | 'desc' | '' = ''
  if (contractColumnFilters.ZCUST.sort) {
    activeSortCol = 'customer'
    activeSortOrder = contractColumnFilters.ZCUST.sort
  } else if (contractColumnFilters.ZMODEL.sort) {
    activeSortCol = 'model'
    activeSortOrder = contractColumnFilters.ZMODEL.sort
  }

  if (activeSortCol && activeSortOrder) {
    list = [...list].sort((a, b) => {
      const valA = String(a[activeSortCol] || '-')
      const valB = String(b[activeSortCol] || '-')
      return activeSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })
  }

  return list
})

const showW5Prev = computed(() => getWeekDateRange(prevPeriodString.value, 'w5') !== '')
const showW6Prev = computed(() => getWeekDateRange(prevPeriodString.value, 'w6') !== '')
const showW5Curr = computed(() => getWeekDateRange(formattedPeriod.value, 'w5') !== '')
const showW6Curr = computed(() => getWeekDateRange(formattedPeriod.value, 'w6') !== '')

const prevColspan = computed(() => (4 + (showW5Prev.value ? 1 : 0) + (showW6Prev.value ? 1 : 0) + 1) * 3)
const currColspan = computed(() => (4 + (showW5Curr.value ? 1 : 0) + (showW6Curr.value ? 1 : 0) + 1) * 3)

const isWeekFull7Days = (spmon: string, weekKey: string) => {
  if (!weeklyWeekInfo.value || !weeklyWeekInfo.value[spmon]) return false
  const rangeStr = weeklyWeekInfo.value[spmon][weekKey]
  if (!rangeStr || rangeStr === '-') return false
  const matches = rangeStr.match(/\d+/g)
  if (!matches || matches.length < 2) return false
  const startDay = parseInt(matches[0], 10)
  const endDay = parseInt(matches[1], 10)
  if (isNaN(startDay) || isNaN(endDay)) return false
  const diff = endDay - startDay + 1
  return diff >= 7
}

const getWeekHighlightClass = (item: any, section: 'prev' | 'curr', weekKey: string) => {
  if (item.isSubtotal || item.isGrandTotal) return ''
  
  const data = item[section]
  if (!data) return ''
  
  const spmon = section === 'prev' ? prevPeriodString.value : formattedPeriod.value
  const isPast = spmon < currentPeriodString.value
  
  const parts = weekKey.split('_')
  const baseWeek = parts[0]
  const suffix = parts[1] ? `_${parts[1]}` : ''
  
  // Highlight SO if month has passed; highlight Forecast if month is active/future.
  if (isPast && suffix === '_mdfo') return ''
  if (!isPast && suffix === '_so') return ''
  
  // If the target week itself is less than 7 days, don't style/highlight it
  if (!isWeekFull7Days(spmon, baseWeek)) return ''
  
  const values: { key: string; val: number }[] = []
  const showW5 = section === 'prev' ? showW5Prev.value : showW5Curr.value
  const showW6 = section === 'prev' ? showW6Prev.value : showW6Curr.value
  
  const weeksToCheck = ['w1', 'w2', 'w3', 'w4']
  if (showW5) weeksToCheck.push('w5')
  if (showW6) weeksToCheck.push('w6')

  weeksToCheck.forEach(w => {
    if (isWeekFull7Days(spmon, w)) {
      const fullKey = `${w}${suffix}`
      if (data[fullKey] !== undefined) {
        values.push({ key: fullKey, val: Number(data[fullKey]) || 0 })
      }
    }
  })
  
  const nonZero = values.filter(v => v.val > 0)
  if (nonZero.length === 0) return ''
  
  let maxVal = -Infinity
  let minVal = Infinity
  nonZero.forEach(v => {
    if (v.val > maxVal) maxVal = v.val
    if (v.val < minVal) minVal = v.val
  })
  
  const currentVal = Number(data[weekKey]) || 0
  if (currentVal === 0) return ''
  
  if (currentVal === maxVal && currentVal === minVal) {
    return weekKey === values.find(v => v.val === maxVal)?.key ? 'bg-emerald-50 text-emerald-700 font-semibold' : ''
  }
  
  if (currentVal === maxVal) {
    return 'bg-emerald-50 text-emerald-700 font-semibold'
  }
  if (currentVal === minVal) {
    return 'bg-rose-50 text-rose-700 font-semibold'
  }
  return ''
}

const getWeeklyItemGroupInfo = (item: any) => {
  const cust = (item.customer || '').toUpperCase().trim()
  
  if (cust.includes('ADM PLANT 4') || cust === 'ADM SAP' ||
      cust.includes('ADM PLANT 5') || cust === 'ADM KAP' ||
      cust === 'TMMIN') {
    return { id: 1, name: 'ADM PLANT 4, ADM PLANT 5 & TMMIN' }
  }
  if (cust === 'MMKI') {
    return { id: 2, name: 'MMKI' }
  }
  if (cust === 'HMMI') {
    return { id: 3, name: 'HMMI' }
  }
  if (cust === 'MKM') {
    return { id: 4, name: 'MKM' }
  }
  if (cust === 'HPM') {
    return { id: 5, name: 'HPM' }
  }
  if (cust === 'SIM') {
    return { id: 6, name: 'SIM' }
  }
  return { id: 7, name: 'Lain-lain' }
}

const getWeeklyModelOrderWeight = (customer: string, model: string) => {
  const c = customer.toUpperCase().trim()
  const m = model.toUpperCase().trim()
  
  let baseWeight = 0
  if (c.includes('ADM PLANT 4') || c === 'ADM SAP') {
    baseWeight = 0
    if (m === 'D14N') return baseWeight + 1
    if (m.includes('D40D VAN') || m === 'D40D/D40L-VAN') return baseWeight + 2
    if (m.includes('D40D PICK') || m === 'D40D/D40L-PICKUP') return baseWeight + 3
    return baseWeight + 99
  }
  if (c.includes('ADM PLANT 5') || c === 'ADM KAP') {
    baseWeight = 100
    if (m === 'D30D') return baseWeight + 1
    if (m === 'D55L') return baseWeight + 2
    if (m === 'D74A') return baseWeight + 3
    if (m === 'D26A') return baseWeight + 4
    return baseWeight + 99
  }
  if (c === 'TMMIN') {
    baseWeight = 200
    if (m === 'D26A') return baseWeight + 1
    if (m === 'D03B') return baseWeight + 2
    if (m === 'D37D') return baseWeight + 3
    return baseWeight + 99
  }
  return 0
}

const weeklyTableRows = computed(() => {
  const list = weeklyDataFiltered.value
  if (list.length === 0) return []

  const groups: Record<number, { name: string; items: any[] }> = {
    1: { name: 'ADM PLANT 4, ADM PLANT 5 & TMMIN', items: [] },
    2: { name: 'MMKI', items: [] },
    3: { name: 'HMMI', items: [] },
    4: { name: 'MKM', items: [] },
    5: { name: 'HPM', items: [] },
    6: { name: 'SIM', items: [] },
    7: { name: 'Lain-lain', items: [] }
  }

  list.forEach(item => {
    groups[getWeeklyItemGroupInfo(item).id].items.push(item)
  })

  const rawRows: any[] = []
  const grandTotalMetrics = {
    prev: { 
      w1_mdfo: 0, w1_so: 0, 
      w2_mdfo: 0, w2_so: 0, 
      w3_mdfo: 0, w3_so: 0, 
      w4_mdfo: 0, w4_so: 0, 
      w5_mdfo: 0, w5_so: 0, 
      w6_mdfo: 0, w6_so: 0 
    },
    curr: { 
      w1_mdfo: 0, w1_so: 0, 
      w2_mdfo: 0, w2_so: 0, 
      w3_mdfo: 0, w3_so: 0, 
      w4_mdfo: 0, w4_so: 0, 
      w5_mdfo: 0, w5_so: 0, 
      w6_mdfo: 0, w6_so: 0 
    }
  }

  for (let id = 1; id <= 7; id++) {
    const grp = groups[id]
    if (grp.items.length === 0) continue

    grp.items.sort((a, b) => {
      const wA = getWeeklyModelOrderWeight(a.customer, a.model)
      const wB = getWeeklyModelOrderWeight(b.customer, b.model)
      if (wA !== wB) return wA - wB
      return a.model.localeCompare(b.model)
    })

    grp.items.forEach(item => {
      rawRows.push({ ...item, isSubtotal: false, isGrandTotal: false })
    })

    const itemsForTotal = id === 3
      ? grp.items.filter(item => {
          const m = (item.model || '').toUpperCase().trim()
          return m.startsWith('SU2ID') || m.startsWith('KS')
        })
      : grp.items

    const subPrevW1_mdfo = itemsForTotal.reduce((sum, item) => sum + (item.prev?.w1_mdfo || 0), 0)
    const subPrevW1_so   = itemsForTotal.reduce((sum, item) => sum + (item.prev?.w1_so || 0), 0)
    const subPrevW2_mdfo = itemsForTotal.reduce((sum, item) => sum + (item.prev?.w2_mdfo || 0), 0)
    const subPrevW2_so   = itemsForTotal.reduce((sum, item) => sum + (item.prev?.w2_so || 0), 0)
    const subPrevW3_mdfo = itemsForTotal.reduce((sum, item) => sum + (item.prev?.w3_mdfo || 0), 0)
    const subPrevW3_so   = itemsForTotal.reduce((sum, item) => sum + (item.prev?.w3_so || 0), 0)
    const subPrevW4_mdfo = itemsForTotal.reduce((sum, item) => sum + (item.prev?.w4_mdfo || 0), 0)
    const subPrevW4_so   = itemsForTotal.reduce((sum, item) => sum + (item.prev?.w4_so || 0), 0)
    const subPrevW5_mdfo = itemsForTotal.reduce((sum, item) => sum + (item.prev?.w5_mdfo || 0), 0)
    const subPrevW5_so   = itemsForTotal.reduce((sum, item) => sum + (item.prev?.w5_so || 0), 0)
    const subPrevW6_mdfo = itemsForTotal.reduce((sum, item) => sum + (item.prev?.w6_mdfo || 0), 0)
    const subPrevW6_so   = itemsForTotal.reduce((sum, item) => sum + (item.prev?.w6_so || 0), 0)

    const subCurrW1_mdfo = itemsForTotal.reduce((sum, item) => sum + (item.curr?.w1_mdfo || 0), 0)
    const subCurrW1_so   = itemsForTotal.reduce((sum, item) => sum + (item.curr?.w1_so || 0), 0)
    const subCurrW2_mdfo = itemsForTotal.reduce((sum, item) => sum + (item.curr?.w2_mdfo || 0), 0)
    const subCurrW2_so   = itemsForTotal.reduce((sum, item) => sum + (item.curr?.w2_so || 0), 0)
    const subCurrW3_mdfo = itemsForTotal.reduce((sum, item) => sum + (item.curr?.w3_mdfo || 0), 0)
    const subCurrW3_so   = itemsForTotal.reduce((sum, item) => sum + (item.curr?.w3_so || 0), 0)
    const subCurrW4_mdfo = itemsForTotal.reduce((sum, item) => sum + (item.curr?.w4_mdfo || 0), 0)
    const subCurrW4_so   = itemsForTotal.reduce((sum, item) => sum + (item.curr?.w4_so || 0), 0)
    const subCurrW5_mdfo = itemsForTotal.reduce((sum, item) => sum + (item.curr?.w5_mdfo || 0), 0)
    const subCurrW5_so   = itemsForTotal.reduce((sum, item) => sum + (item.curr?.w5_so || 0), 0)
    const subCurrW6_mdfo = itemsForTotal.reduce((sum, item) => sum + (item.curr?.w6_mdfo || 0), 0)
    const subCurrW6_so   = itemsForTotal.reduce((sum, item) => sum + (item.curr?.w6_so || 0), 0)

    grandTotalMetrics.prev.w1_mdfo += subPrevW1_mdfo
    grandTotalMetrics.prev.w1_so   += subPrevW1_so
    grandTotalMetrics.prev.w2_mdfo += subPrevW2_mdfo
    grandTotalMetrics.prev.w2_so   += subPrevW2_so
    grandTotalMetrics.prev.w3_mdfo += subPrevW3_mdfo
    grandTotalMetrics.prev.w3_so   += subPrevW3_so
    grandTotalMetrics.prev.w4_mdfo += subPrevW4_mdfo
    grandTotalMetrics.prev.w4_so   += subPrevW4_so
    grandTotalMetrics.prev.w5_mdfo += subPrevW5_mdfo
    grandTotalMetrics.prev.w5_so   += subPrevW5_so
    grandTotalMetrics.prev.w6_mdfo += subPrevW6_mdfo
    grandTotalMetrics.prev.w6_so   += subPrevW6_so

    grandTotalMetrics.curr.w1_mdfo += subCurrW1_mdfo
    grandTotalMetrics.curr.w1_so   += subCurrW1_so
    grandTotalMetrics.curr.w2_mdfo += subCurrW2_mdfo
    grandTotalMetrics.curr.w2_so   += subCurrW2_so
    grandTotalMetrics.curr.w3_mdfo += subCurrW3_mdfo
    grandTotalMetrics.curr.w3_so   += subCurrW3_so
    grandTotalMetrics.curr.w4_mdfo += subCurrW4_mdfo
    grandTotalMetrics.curr.w4_so   += subCurrW4_so
    grandTotalMetrics.curr.w5_mdfo += subCurrW5_mdfo
    grandTotalMetrics.curr.w5_so   += subCurrW5_so
    grandTotalMetrics.curr.w6_mdfo += subCurrW6_mdfo
    grandTotalMetrics.curr.w6_so   += subCurrW6_so

    const labelSuffix = id === 3 ? ' (SU2ID & KS)' : ''

    rawRows.push({
      isSubtotal: true,
      isGrandTotal: false,
      customer: `TOTAL ${grp.name.toUpperCase()}${labelSuffix}`,
      model: '',
      prev: {
        w1_mdfo: subPrevW1_mdfo, w1_so: subPrevW1_so,
        w2_mdfo: subPrevW2_mdfo, w2_so: subPrevW2_so,
        w3_mdfo: subPrevW3_mdfo, w3_so: subPrevW3_so,
        w4_mdfo: subPrevW4_mdfo, w4_so: subPrevW4_so,
        w5_mdfo: subPrevW5_mdfo, w5_so: subPrevW5_so,
        w6_mdfo: subPrevW6_mdfo, w6_so: subPrevW6_so
      },
      curr: {
        w1_mdfo: subCurrW1_mdfo, w1_so: subCurrW1_so,
        w2_mdfo: subCurrW2_mdfo, w2_so: subCurrW2_so,
        w3_mdfo: subCurrW3_mdfo, w3_so: subCurrW3_so,
        w4_mdfo: subCurrW4_mdfo, w4_so: subCurrW4_so,
        w5_mdfo: subCurrW5_mdfo, w5_so: subCurrW5_so,
        w6_mdfo: subCurrW6_mdfo, w6_so: subCurrW6_so
      }
    })
  }

  if (rawRows.length > 0) {
    rawRows.push({
      isSubtotal: false,
      isGrandTotal: true,
      customer: 'TOTAL MAJ (UNIT)',
      model: '',
      prev: grandTotalMetrics.prev,
      curr: grandTotalMetrics.curr
    })
  }

  const rowsWithSpan: any[] = []
  for (let i = 0; i < rawRows.length; i++) {
    const currentRow = rawRows[i]
    if (currentRow.isSubtotal || currentRow.isGrandTotal) {
      rowsWithSpan.push({ ...currentRow, showZcust: true, zcustSpan: 1 })
      continue
    }
    const isPrevSame = i > 0 && !rawRows[i - 1].isSubtotal && !rawRows[i - 1].isGrandTotal && rawRows[i - 1].customer === currentRow.customer
    if (isPrevSame) {
      rowsWithSpan.push({ ...currentRow, showZcust: false, zcustSpan: 0 })
    } else {
      let span = 1
      for (let j = i + 1; j < rawRows.length; j++) {
        if (rawRows[j].isSubtotal || rawRows[j].isGrandTotal || rawRows[j].customer !== currentRow.customer) break
        span++
      }
      rowsWithSpan.push({ ...currentRow, showZcust: true, zcustSpan: span })
    }
  }

  return rowsWithSpan
})

const weeklyGrandTotals = computed(() => {
  let prevTotalForecast = 0
  let prevTotalSo = 0
  let currTotalForecast = 0
  let currTotalSo = 0
  
  const currWeeksSum = {
    w1_mdfo: 0, w1_so: 0,
    w2_mdfo: 0, w2_so: 0,
    w3_mdfo: 0, w3_so: 0,
    w4_mdfo: 0, w4_so: 0,
    w5_mdfo: 0, w5_so: 0,
    w6_mdfo: 0, w6_so: 0
  }
  
  weeklyDataFiltered.value.forEach(item => {
    const cust = (item.customer || '').toUpperCase().trim()
    if (cust === 'HMMI') {
      const m = (item.model || '').toUpperCase().trim()
      if (!m.startsWith('SU2ID') && !m.startsWith('KS')) {
        return
      }
    }
    
    prevTotalForecast += (item.prev?.w1_mdfo || 0) + (item.prev?.w2_mdfo || 0) + (item.prev?.w3_mdfo || 0) + (item.prev?.w4_mdfo || 0) + (item.prev?.w5_mdfo || 0) + (item.prev?.w6_mdfo || 0)
    prevTotalSo       += (item.prev?.w1_so || 0) + (item.prev?.w2_so || 0) + (item.prev?.w3_so || 0) + (item.prev?.w4_so || 0) + (item.prev?.w5_so || 0) + (item.prev?.w6_so || 0)
    
    currTotalForecast += (item.curr?.w1_mdfo || 0) + (item.curr?.w2_mdfo || 0) + (item.curr?.w3_mdfo || 0) + (item.curr?.w4_mdfo || 0) + (item.curr?.w5_mdfo || 0) + (item.curr?.w6_mdfo || 0)
    currTotalSo       += (item.curr?.w1_so || 0) + (item.curr?.w2_so || 0) + (item.curr?.w3_so || 0) + (item.curr?.w4_so || 0) + (item.curr?.w5_so || 0) + (item.curr?.w6_so || 0)
    
    currWeeksSum.w1_mdfo += item.curr?.w1_mdfo || 0
    currWeeksSum.w1_so   += item.curr?.w1_so || 0
    currWeeksSum.w2_mdfo += item.curr?.w2_mdfo || 0
    currWeeksSum.w2_so   += item.curr?.w2_so || 0
    currWeeksSum.w3_mdfo += item.curr?.w3_mdfo || 0
    currWeeksSum.w3_so   += item.curr?.w3_so || 0
    currWeeksSum.w4_mdfo += item.curr?.w4_mdfo || 0
    currWeeksSum.w4_so   += item.curr?.w4_so || 0
    currWeeksSum.w5_mdfo += item.curr?.w5_mdfo || 0
    currWeeksSum.w5_so   += item.curr?.w5_so || 0
    currWeeksSum.w6_mdfo += item.curr?.w6_mdfo || 0
    currWeeksSum.w6_so   += item.curr?.w6_so || 0
  })
  
  const spmon = formattedPeriod.value
  const isPast = spmon < currentPeriodString.value
  const activeWeeks: { label: string; sum: number }[] = []
  
  if (isWeekFull7Days(spmon, 'w1')) {
    activeWeeks.push({ label: 'W1', sum: isPast ? currWeeksSum.w1_so : currWeeksSum.w1_mdfo })
  }
  if (isWeekFull7Days(spmon, 'w2')) {
    activeWeeks.push({ label: 'W2', sum: isPast ? currWeeksSum.w2_so : currWeeksSum.w2_mdfo })
  }
  if (isWeekFull7Days(spmon, 'w3')) {
    activeWeeks.push({ label: 'W3', sum: isPast ? currWeeksSum.w3_so : currWeeksSum.w3_mdfo })
  }
  if (isWeekFull7Days(spmon, 'w4')) {
    activeWeeks.push({ label: 'W4', sum: isPast ? currWeeksSum.w4_so : currWeeksSum.w4_mdfo })
  }
  if (showW5Curr.value && isWeekFull7Days(spmon, 'w5')) {
    activeWeeks.push({ label: 'W5', sum: isPast ? currWeeksSum.w5_so : currWeeksSum.w5_mdfo })
  }
  if (showW6Curr.value && isWeekFull7Days(spmon, 'w6')) {
    activeWeeks.push({ label: 'W6', sum: isPast ? currWeeksSum.w6_so : currWeeksSum.w6_mdfo })
  }
  
  let maxWeek = '-'
  let maxVal = -Infinity
  let minWeek = '-'
  let minVal = Infinity
  
  if (activeWeeks.length > 0) {
    activeWeeks.forEach(w => {
      if (w.sum > maxVal) {
        maxVal = w.sum
        maxWeek = w.label
      }
      if (w.sum < minVal) {
        minVal = w.sum
        minWeek = w.label
      }
    })
  }
  
  return {
    prevTotalForecast,
    prevTotalSo,
    currTotalForecast,
    currTotalSo,
    maxWeek: maxWeek !== '-' ? `${maxWeek} (${formatNumber(maxVal)})` : '-',
    minWeek: minWeek !== '-' ? `${minWeek} (${formatNumber(minVal)})` : '-'
  }
})

const activeFilterDropdown = ref<{ mode: 'contract' | 'quotation' | 'quotationSummary'; column: string } | null>(null)

const contractColumnFilters = reactive<Record<string, { sort: 'asc' | 'desc' | ''; search: string; hiddenValues: string[] }>>({
  ZCUST: { sort: '', search: '', hiddenValues: [] },
  ZMODEL: { sort: '', search: '', hiddenValues: [] },
})

const quotationSummaryColumnFilters = reactive<Record<string, { sort: 'asc' | 'desc' | ''; search: string; hiddenValues: string[] }>>({
  ZCUST: { sort: '', search: '', hiddenValues: [] },
  ZMODEL: { sort: '', search: '', hiddenValues: [] },
})

const quotationColumnFilters = reactive<Record<string, { sort: 'asc' | 'desc' | ''; search: string; hiddenValues: string[] }>>({
  customer: { sort: '', search: '', hiddenValues: [] },
  MATNR: { sort: '', search: '', hiddenValues: [] },
  job_number: { sort: '', search: '', hiddenValues: [] },
  project: { sort: '', search: '', hiddenValues: [] },
  project_detail: { sort: '', search: '', hiddenValues: [] },
})

const dialogDetails = ref(false)
const selectedItem = ref<any>(null)

const openModelDetails = (item: any) => {
  if (currentMode.value === 'quotation' && !item.MATNR) {
    const matched = normalizedItems.value.find(c => 
      (c.ZCUST || '').trim().toUpperCase() === (item.ZCUST || '').trim().toUpperCase() &&
      (c.ZMODEL || '').trim().toUpperCase() === (item.ZMODEL || '').trim().toUpperCase()
    )
    if (matched) {
      selectedItem.value = matched
    } else {
      selectedItem.value = item
    }
  } else {
    selectedItem.value = item
  }
  dialogDetails.value = true
}

const snackbar = reactive({
  show: false,
  text: '',
  color: 'success'
})

const exportExcelWeekly = () => {
  if (weeklyTableRows.value.length === 0) return
  
  const prevMonthStr = prevMonthLabel.value
  const currMonthStr = currMonthLabel.value

  const headerRow1 = ['Customer', 'Model', 'Part Number', 'Job Number']
  const headerRow2 = ['', '', '', '']
  const headerRow3 = ['', '', '', '']

  const prevWeeksCount = 4 + (showW5Prev.value ? 1 : 0) + (showW6Prev.value ? 1 : 0)
  const prevColsCount = (prevWeeksCount + 1) * 3

  const currWeeksCount = 4 + (showW5Curr.value ? 1 : 0) + (showW6Curr.value ? 1 : 0)
  const currColsCount = (currWeeksCount + 1) * 3

  // Month headers
  headerRow1.push(prevMonthStr)
  for (let i = 0; i < prevColsCount - 1; i++) {
    headerRow1.push('')
  }
  headerRow1.push(currMonthStr)
  for (let i = 0; i < currColsCount - 1; i++) {
    headerRow1.push('')
  }

  // Week headers
  for (let i = 1; i <= prevWeeksCount; i++) {
    const range = getWeekDateRange(prevPeriodString.value, `w${i}`)
    headerRow2.push(`W${i} (${range})`, '', '')
  }
  headerRow2.push('Total', '', '')

  for (let i = 1; i <= currWeeksCount; i++) {
    const range = getWeekDateRange(formattedPeriod.value, `w${i}`)
    headerRow2.push(`W${i} (${range})`, '', '')
  }
  headerRow2.push('Total', '', '')

  // FC / SO / % headers
  for (let i = 0; i < prevWeeksCount + 1; i++) {
    headerRow3.push('P', 'A', '%')
  }
  for (let i = 0; i < currWeeksCount + 1; i++) {
    headerRow3.push('P', 'A', '%')
  }

  const dataRows = weeklyTableRows.value.map(item => {
    const row = [
      item.customer || '',
      item.isSubtotal || item.isGrandTotal ? '' : (item.model || ''),
      item.isSubtotal || item.isGrandTotal ? '' : (item.matnr || ''),
      item.isSubtotal || item.isGrandTotal ? '' : (item.job_number || '')
    ]

    // Previous Month values
    row.push(Number(item.prev?.w1_mdfo) || 0)
    row.push(Number(item.prev?.w1_so) || 0)
    row.push(getSoVsMdfoPercent(item.prev?.w1_mdfo, item.prev?.w1_so))

    row.push(Number(item.prev?.w2_mdfo) || 0)
    row.push(Number(item.prev?.w2_so) || 0)
    row.push(getSoVsMdfoPercent(item.prev?.w2_mdfo, item.prev?.w2_so))

    row.push(Number(item.prev?.w3_mdfo) || 0)
    row.push(Number(item.prev?.w3_so) || 0)
    row.push(getSoVsMdfoPercent(item.prev?.w3_mdfo, item.prev?.w3_so))

    row.push(Number(item.prev?.w4_mdfo) || 0)
    row.push(Number(item.prev?.w4_so) || 0)
    row.push(getSoVsMdfoPercent(item.prev?.w4_mdfo, item.prev?.w4_so))

    if (showW5Prev.value) {
      row.push(Number(item.prev?.w5_mdfo) || 0)
      row.push(Number(item.prev?.w5_so) || 0)
      row.push(getSoVsMdfoPercent(item.prev?.w5_mdfo, item.prev?.w5_so))
    }
    if (showW6Prev.value) {
      row.push(Number(item.prev?.w6_mdfo) || 0)
      row.push(Number(item.prev?.w6_so) || 0)
      row.push(getSoVsMdfoPercent(item.prev?.w6_mdfo, item.prev?.w6_so))
    }
    row.push(getWeeklyRowPrevTotalMdfo(item))
    row.push(getWeeklyRowPrevTotalSo(item))
    row.push(getSoVsMdfoPercent(getWeeklyRowPrevTotalMdfo(item), getWeeklyRowPrevTotalSo(item)))

    // Current Month values
    row.push(Number(item.curr?.w1_mdfo) || 0)
    row.push(Number(item.curr?.w1_so) || 0)
    row.push(getSoVsMdfoPercent(item.curr?.w1_mdfo, item.curr?.w1_so))

    row.push(Number(item.curr?.w2_mdfo) || 0)
    row.push(Number(item.curr?.w2_so) || 0)
    row.push(getSoVsMdfoPercent(item.curr?.w2_mdfo, item.curr?.w2_so))

    row.push(Number(item.curr?.w3_mdfo) || 0)
    row.push(Number(item.curr?.w3_so) || 0)
    row.push(getSoVsMdfoPercent(item.curr?.w3_mdfo, item.curr?.w3_so))

    row.push(Number(item.curr?.w4_mdfo) || 0)
    row.push(Number(item.curr?.w4_so) || 0)
    row.push(getSoVsMdfoPercent(item.curr?.w4_mdfo, item.curr?.w4_so))

    if (showW5Curr.value) {
      row.push(Number(item.curr?.w5_mdfo) || 0)
      row.push(Number(item.curr?.w5_so) || 0)
      row.push(getSoVsMdfoPercent(item.curr?.w5_mdfo, item.curr?.w5_so))
    }
    if (showW6Curr.value) {
      row.push(Number(item.curr?.w6_mdfo) || 0)
      row.push(Number(item.curr?.w6_so) || 0)
      row.push(getSoVsMdfoPercent(item.curr?.w6_mdfo, item.curr?.w6_so))
    }
    row.push(getWeeklyRowCurrTotalMdfo(item))
    row.push(getWeeklyRowCurrTotalSo(item))
    row.push(getSoVsMdfoPercent(getWeeklyRowCurrTotalMdfo(item), getWeeklyRowCurrTotalSo(item)))

    return row
  })
  
  const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, headerRow3, ...dataRows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Weekly_Contract_Recap')
  XLSX.writeFile(wb, `Weekly_Contract_Monitoring_${formattedPeriod.value}.xlsx`)
}

const showSnackbar = (text: string, color = 'success') => {
  snackbar.text = text
  snackbar.color = color
  snackbar.show = true
}

const dialogConfirm = ref(false)
const confirmPendingAction = ref<{ item: any; newStatus: string; originalStatus: string } | null>(null)

const cancelUpdateStatus = () => {
  if (confirmPendingAction.value) {
    confirmPendingAction.value.item.unit_status = confirmPendingAction.value.originalStatus
  }
  dialogConfirm.value = false
  confirmPendingAction.value = null
}

const confirmUpdateStatus = async () => {
  if (!confirmPendingAction.value) return
  const { item, newStatus, originalStatus } = confirmPendingAction.value
  dialogConfirm.value = false
  confirmPendingAction.value = null

  // Find original raw item from store to get original unmodified quantities
  const rawItem = items.value.find(i => i.ZCUST === item.ZCUST && i.ZMODEL === item.ZMODEL && i.MATNR === item.MATNR)
  const sourceItem = rawItem || item

  let qty = 0
  if (newStatus === 'Contract' || newStatus === 'Quotation') {
    qty = Number(sourceItem.UMONTH1) || 0
  } else if (newStatus === 'Contract Rev 01' || newStatus === 'MDFO') {
    qty = Number(sourceItem.MDFO1) || 0
  } else if (newStatus === 'SO' || newStatus === 'Sales Order') {
    qty = Number(sourceItem.SO1) || 0
  }

  const spmon1 = item.SPMON1 || formattedPeriod.value
  let periodStr = ''
  if (String(spmon1).length === 6) {
    periodStr = `${String(spmon1).substring(0, 4)}-${String(spmon1).substring(4, 6)}-01`
  } else {
    periodStr = `${filter.year}-${filter.month}-01`
  }

  const parts = (item.ZMODEL || '').split(' ')
  const projectDetailStr = parts.slice(1).join(' ') || ''

  const custVal = item.ZCUST || item.zcust || item.customer || ''
  const modelVal = item.ZMODEL || item.zmodel || ''

  // Form-encoded parameters (for PHP CodeIgniter $_POST)
  const params = new URLSearchParams()
  params.append('period', periodStr)
  params.append('periode', periodStr)
  params.append('spmon', String(spmon1).length === 6 ? spmon1 : formattedPeriod.value)
  params.append('month', String(spmon1).length === 6 ? spmon1 : formattedPeriod.value)
  params.append('customer', custVal)
  params.append('zcust', custVal)
  params.append('model', modelVal)
  params.append('zmodel', modelVal)
  params.append('project_detail', projectDetailStr)
  params.append('unit_status', newStatus)
  params.append('qty', String(qty))
  params.append('unit_month', String(qty))

  // JSON payload
  const jsonPayload = {
    period: periodStr,
    periode: periodStr,
    spmon: String(spmon1).length === 6 ? spmon1 : formattedPeriod.value,
    month: String(spmon1).length === 6 ? spmon1 : formattedPeriod.value,
    customer: custVal,
    zcust: custVal,
    model: modelVal,
    zmodel: modelVal,
    project_detail: projectDetailStr,
    unit_status: newStatus,
    qty: qty,
    unit_month: qty
  }

  const localKey = `unit_status_${spmon1}_${(custVal).trim().toUpperCase()}_${(modelVal).trim().toUpperCase()}`
  localStorage.setItem(localKey, newStatus)
  
  // Update local state in unitMonthStatuses reactive array immediately
  const matched = unitMonthStatuses.value.find(s => {
    const sCust = (s.zcust || s.customer || '').trim().toUpperCase()
    const sModelRaw = (s.model || s.zmodel || '').trim().toUpperCase()
    const sDetail = (s.project_detail || '').trim().toUpperCase()
    const sModelCombined = sDetail ? `${sModelRaw} ${sDetail}`.trim() : sModelRaw
    const itemCust = (item.ZCUST || item.customer || '').trim().toUpperCase()
    const itemModel = (item.ZMODEL || item.model || '').trim().toUpperCase()
    return sCust === itemCust && (sModelCombined === itemModel || sModelRaw === itemModel)
  })
  if (matched) {
    matched.unit_status = newStatus
    matched.unit_month = String(qty)
  } else {
    unitMonthStatuses.value.push({
      customer: custVal,
      zcust: custVal,
      model: modelVal,
      zmodel: modelVal,
      project_detail: projectDetailStr,
      unit_status: newStatus,
      unit_month: String(qty)
    })
  }
  
  if (rawItem) {
    rawItem.unit_status = newStatus
  }
  item.unit_status = newStatus
  
  showSnackbar('Status unit berhasil diperbarui!', 'success')

  // Asynchronously send to backend in background without freezing UI
  try {
    const configStore = useConfigStore()
    const url = `http://${configStore.apiUrl}/majsf_rest_api/api/Report_delivery/update_unit_month_spesific`
    axios.post(url, params, { timeout: 5000 }).catch(() => {
      axios.post(url, jsonPayload, { timeout: 5000 }).catch(err => {
        console.warn('Background status sync error:', err)
      })
    })
  } catch (err: any) {
    console.warn('Failed to dispatch status sync:', err)
  }
}

const updateUnitStatus = (item: any, newStatus: string) => {
  if (!permissions.value?.create) {
    showSnackbar('Anda tidak memiliki akses untuk mengubah status unit', 'error')
    return
  }
  const spmon1 = item.SPMON1 || formattedPeriod.value
  const localKey = `unit_status_${spmon1}_${(item.ZCUST || '').trim().toUpperCase()}_${(item.ZMODEL || '').trim().toUpperCase()}`
  
  const rawItem = items.value.find(i => i.ZCUST === item.ZCUST && i.ZMODEL === item.ZMODEL && i.MATNR === item.MATNR)
  let originalStatus = (rawItem && rawItem.unit_status) || localStorage.getItem(localKey) || 'Contract'
  if (originalStatus === 'MDFO') originalStatus = 'Contract Rev 01'

  if (originalStatus === newStatus) return

  confirmPendingAction.value = { item, newStatus, originalStatus }
  dialogConfirm.value = true
}

const formattedPeriod = computed(() => `${filter.year}${filter.month}`)

const normalizedItems = computed(() => {
  const rawItems = items.value || []
  if (rawItems.length === 0) return []

  const baseItems = rawItems.map(item => {
    let newItem = { ...item }

    // 1. Initialize unit_status based on SAP VBELN document prefix (Q: Quotation, C: Contract, S: Sales Order)
    let sapDefaultStatus = 'Contract'
    for (const f of [item.VBELN3, item.VBELN4]) {
      const val = (f || '').trim().toUpperCase()
      if (val.startsWith('C')) {
        sapDefaultStatus = 'Contract'
        break
      } else if (val.startsWith('Q')) {
        sapDefaultStatus = 'Quotation'
        break
      } else if (val.startsWith('S')) {
        sapDefaultStatus = 'Sales Order'
        break
      }
    }

    const spmon1 = item.SPMON1 || formattedPeriod.value
    const localKey = `unit_status_${spmon1}_${(item.ZCUST || '').trim().toUpperCase()}_${(item.ZMODEL || '').trim().toUpperCase()}`
    
    // Find matching status in unitMonthStatuses (prioritizing non-null status)
    const matchedStatus = unitMonthStatuses.value.find(s => {
      if (!s.unit_status) return false
      const sCust = (s.zcust || s.customer || '').trim().toUpperCase()
      const itemCust = (item.ZCUST || item.customer || '').trim().toUpperCase()
      if (sCust !== itemCust) return false

      const sModelRaw = (s.model || s.zmodel || '').trim().toUpperCase()
      const sDetail = (s.project_detail || '').trim().toUpperCase()
      const sModelCombined = sDetail ? `${sModelRaw} ${sDetail}`.trim() : sModelRaw
      
      const itemModel = (item.ZMODEL || item.model || '').trim().toUpperCase()

      return sModelCombined === itemModel || sModelRaw === itemModel
    }) || unitMonthStatuses.value.find(s => {
      const sCust = (s.zcust || s.customer || '').trim().toUpperCase()
      const itemCust = (item.ZCUST || item.customer || '').trim().toUpperCase()
      if (sCust !== itemCust) return false

      const sModelRaw = (s.model || s.zmodel || '').trim().toUpperCase()
      const sDetail = (s.project_detail || '').trim().toUpperCase()
      const sModelCombined = sDetail ? `${sModelRaw} ${sDetail}`.trim() : sModelRaw
      
      const itemModel = (item.ZMODEL || item.model || '').trim().toUpperCase()

      return sModelCombined === itemModel || sModelRaw === itemModel
    })
    
    let resolvedStatus = sapDefaultStatus
    const cachedLocal = localStorage.getItem(localKey)
    if (matchedStatus && matchedStatus.unit_status) {
      resolvedStatus = matchedStatus.unit_status
    } else if (cachedLocal) {
      resolvedStatus = cachedLocal
    } else if (item.unit_status) {
      resolvedStatus = item.unit_status
    }
    if (resolvedStatus === 'SO') {
      resolvedStatus = 'Sales Order'
    }
    if (resolvedStatus === 'MDFO') {
      resolvedStatus = 'Contract Rev 01'
    }
    newItem.unit_status = resolvedStatus

    // 2. Determine base UMONTH and UMONTH1 values
    let valPrev = Number(item.UMONTH) || 0
    let valCurr = Number(item.UMONTH1) || 0

    if (newItem.unit_status === 'Contract Rev 01' || newItem.unit_status === 'MDFO') {
      valCurr = Number(item.MDFO1) || 0
    } else if (newItem.unit_status === 'SO' || newItem.unit_status === 'Sales Order') {
      valCurr = Number(item.SO1) || 0
    } else if (newItem.unit_status === 'Contract' || newItem.unit_status === 'Quotation') {
      valCurr = Number(item.UMONTH1) || 0
    } else if (matchedStatus && matchedStatus.unit_month !== null && matchedStatus.unit_month !== undefined && matchedStatus.unit_month !== '') {
      valCurr = Number(matchedStatus.unit_month) || 0
    }

    // 3. Apply placeholder zero logic
    const isUmonth1 = valPrev === 1
    const prevMatch = (valPrev === 0 || valPrev === 1) && 
                      (Number(item.MDFO) === 0 || Number(item.MDFO) === 1)
    const currMatch = (valCurr === 0 || valCurr === 1) && 
                      (Number(item.MDFO1) === 0 || Number(item.MDFO1) === 1)

    if (prevMatch || isUmonth1) {
      newItem.UMONTH = 0
      newItem.UDAY = 0
      newItem.MDFO = 0
      newItem.SO = 0
    } else {
      newItem.UMONTH = valPrev
      newItem.UDAY = Number(item.WDAY) > 0 ? (valPrev / Number(item.WDAY)) : 0
      newItem.MDFO = Number(item.MDFO) || 0
      newItem.SO = Number(item.SO) || 0
    }

    if (currMatch) {
      newItem.UMONTH1 = 0
      newItem.UDAY1 = 0
      newItem.MDFO1 = 0
      newItem.SO1 = 0
    } else {
      newItem.UMONTH1 = valCurr
      newItem.UDAY1 = Number(item.WDAY1) > 0 ? (valCurr / Number(item.WDAY1)) : 0
      newItem.MDFO1 = Number(item.MDFO1) || 0
      newItem.SO1 = Number(item.SO1) || 0
    }

    return newItem
  })

  // Index baseItems for fast O(1) lookup
  const baseItemsMap = new Map<string, any>()
  baseItems.forEach(i => {
    const k = `${(i.ZCUST || '').toUpperCase().trim()}_${(i.ZMODEL || '').toUpperCase().trim()}`
    baseItemsMap.set(k, i)
  })

  // Second pass: for HMMI COMMON items, sum the values from LHD and RHD items
  return baseItems.map(item => {
    const cust = (item.ZCUST || '').toUpperCase().trim()
    const model = (item.ZMODEL || '').toUpperCase().trim()

    if (cust === 'HMMI' && (model === 'SU2ID COMMON' || model === 'KS COMMON')) {
      const modelPrefix = model.replace(' COMMON', '') // "SU2ID" or "KS"
      
      const lhdItem = baseItemsMap.get(`HMMI_${modelPrefix.toUpperCase()} LHD`)
      const rhdItem = baseItemsMap.get(`HMMI_${modelPrefix.toUpperCase()} RHD`)

      const lhdStatus = lhdItem?.unit_status || (lhdItem?.VBELN3?.startsWith('Q') ? 'Quotation' : 'Contract')
      const rhdStatus = rhdItem?.unit_status || (rhdItem?.VBELN3?.startsWith('Q') ? 'Quotation' : 'Contract')
      let commonStatus = 'Contract'

      if (lhdStatus === 'SO' || lhdStatus === 'Sales Order' || rhdStatus === 'SO' || rhdStatus === 'Sales Order') {
        commonStatus = 'Sales Order'
      } else if (lhdStatus === 'Contract Rev 01' || lhdStatus === 'MDFO' || rhdStatus === 'Contract Rev 01' || rhdStatus === 'MDFO') {
        commonStatus = 'Contract Rev 01'
      } else if (lhdStatus === 'Contract' || rhdStatus === 'Contract') {
        commonStatus = 'Contract'
      } else if (lhdStatus === 'Quotation' && rhdStatus === 'Quotation') {
        commonStatus = 'Quotation'
      } else {
        commonStatus = lhdStatus || rhdStatus || 'Contract'
      }

      let sumUmonth = 0
      let sumUmonth1 = 0
      let sumMdfo = 0
      let sumMdfo1 = 0
      let sumSo = 0
      let sumSo1 = 0

      // UMONTH (previous month) always sums the child rows' contract values
      if (lhdItem) {
        sumUmonth += Number(lhdItem.UMONTH) || 0
        sumMdfo += Number(lhdItem.MDFO) || 0
        sumMdfo1 += Number(lhdItem.MDFO1) || 0
        sumSo += Number(lhdItem.SO) || 0
        sumSo1 += Number(lhdItem.SO1) || 0
      }

      if (rhdItem) {
        sumUmonth += Number(rhdItem.UMONTH) || 0
        sumMdfo += Number(rhdItem.MDFO) || 0
        sumMdfo1 += Number(rhdItem.MDFO1) || 0
        sumSo += Number(rhdItem.SO) || 0
        sumSo1 += Number(rhdItem.SO1) || 0
      }

      // UMONTH1 (current month) accurately sums the resolved UMONTH1 of LHD and RHD
      sumUmonth1 = (Number(lhdItem?.UMONTH1) || 0) + (Number(rhdItem?.UMONTH1) || 0)

      let newItem = { ...item }
      newItem.unit_status = commonStatus
      newItem.UMONTH = sumUmonth
      newItem.UMONTH1 = sumUmonth1
      newItem.MDFO = sumMdfo
      newItem.MDFO1 = sumMdfo1
      newItem.SO = sumSo
      newItem.SO1 = sumSo1

      newItem.UDAY = Number(newItem.WDAY) > 0 ? (sumUmonth / Number(newItem.WDAY)) : 0
      newItem.UDAY1 = Number(newItem.WDAY1) > 0 ? (sumUmonth1 / Number(newItem.WDAY1)) : 0

      newItem.DIFF_UMONTH = Number(newItem.UMONTH1) - Number(newItem.UMONTH)
      newItem.DIFF_UDAY = Number(newItem.UDAY1) - Number(newItem.UDAY)
      newItem.PRS_UMONTH = Number(newItem.UMONTH) > 0 ? (newItem.DIFF_UMONTH / newItem.UMONTH) : 0
      newItem.PRS_UDAY = Number(newItem.UDAY) > 0 ? (newItem.DIFF_UDAY / newItem.UDAY) : 0

      return newItem
    }

    let newItem = { ...item }
    const prevMatch = (Number(item.UMONTH) === 0 || Number(item.UMONTH) === 1) && 
                      (Number(item.MDFO) === 0 || Number(item.MDFO) === 1)
    const currMatch = (Number(item.UMONTH1) === 0 || Number(item.UMONTH1) === 1) && 
                      (Number(item.MDFO1) === 0 || Number(item.MDFO1) === 1)
    const isUmonth1 = (Number(item.UMONTH) === 1)

    if (prevMatch || currMatch || isUmonth1) {
      newItem.DIFF_UMONTH = 0
      newItem.DIFF_UDAY = 0
      newItem.PRS_UMONTH = 0
      newItem.PRS_UDAY = 0
    } else {
      newItem.DIFF_UMONTH = Number(newItem.UMONTH1) - Number(newItem.UMONTH)
      newItem.DIFF_UDAY = Number(newItem.UDAY1) - Number(newItem.UDAY)
      newItem.PRS_UMONTH = Number(newItem.UMONTH) > 0 ? (newItem.DIFF_UMONTH / newItem.UMONTH) : 0
      newItem.PRS_UDAY = Number(newItem.UDAY) > 0 ? (newItem.DIFF_UDAY / newItem.UDAY) : 0
    }

    return newItem
  })
})

// Cache for unitMonthStatuses per period to allow instant month switching
const statusCache = new Map<string, any[]>()

const loadData = async (force = false) => {
  const periodStr = `${filter.year}-${filter.month}-01`
  const spmon = formattedPeriod.value
  const configStore = useConfigStore()
  const statusUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/Report_delivery/unit_month_status`
  
  // Use cached unit statuses immediately if available
  if (!force && statusCache.has(periodStr)) {
    unitMonthStatuses.value = statusCache.get(periodStr)!
  }

  loading.value = true
  try {
    if (currentMode.value === 'contract' && contractCycle.value === 'weekly') {
      const [weeklyRes] = await Promise.all([
        getWeeklyUnitData(spmon),
        store.fetchSalesItems(spmon, force).catch(err => {
          console.error('Failed to fetch monthly items for weekly model mapping:', err)
        })
      ])
      weeklyData.value = weeklyRes.data || []
      weeklyWeekInfo.value = weeklyRes.week_info || {}
    } else if (currentMode.value === 'contract') {
      // Fetch unit_month_status in background/parallel without delaying sales data display
      const statusPromise = axios.get(statusUrl, { params: { period: periodStr }, timeout: 3500 })
        .then(res => {
          const rawStatus = res.data
          const list: any[] = Array.isArray(rawStatus)
            ? rawStatus
            : Array.isArray(rawStatus?.data)
            ? rawStatus.data
            : []

          const statusMap = new Map<string, any>()
          list.forEach(item => {
            const cust = (item.zcust || item.customer || '').trim().toUpperCase()
            const zmodel = (item.zmodel || '').trim().toUpperCase()
            const model = (item.model || '').trim().toUpperCase()
            const detail = (item.project_detail || '').trim().toUpperCase()
            const combined = detail ? `${model} ${detail}`.trim() : model

            const key = `${cust}_${zmodel || combined}`
            const existing = statusMap.get(key)
            if (!existing) {
              statusMap.set(key, item)
            } else if (!existing.unit_status && item.unit_status) {
              statusMap.set(key, item)
            }
          })
          const cleanStatuses = Array.from(statusMap.values())
          statusCache.set(periodStr, cleanStatuses)
          unitMonthStatuses.value = cleanStatuses
        })
        .catch(err => {
          console.warn('Failed to fetch unit month status:', err)
        })

      await Promise.all([
        store.fetchSalesItems(spmon, force),
        statusPromise
      ])
    } else {
      // Quotation Mode: requires quotationDetail & quotationSummary (which comes from sales items)
      await Promise.all([
        store.fetchSalesItems(spmon, force),
        store.fetchQuotationItems(spmon, force)
      ])
    }
  } catch (err) {
    console.error('Error loading data:', err)
  } finally {
    loading.value = false
  }
}

watch(() => [filter.month, filter.year, currentMode.value, contractCycle.value], () => { loadData() })
watch(() => [filter.search, filter.perPage, filter.month, filter.year, currentMode.value, contractCycle.value], () => { currentPage.value = 1 })
watch(contractColumnFilters, () => { currentPage.value = 1 }, { deep: true })
watch(quotationColumnFilters, () => { currentPage.value = 1 }, { deep: true })
watch(quotationSummaryColumnFilters, () => { currentPage.value = 1 }, { deep: true })

const handleWindowClick = () => { activeFilterDropdown.value = null }

onMounted(() => {
  loadData()
  window.addEventListener('click', handleWindowClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleWindowClick)
})

const formatSpmon = (spmon: string | undefined | null) => {
  if (!spmon || spmon.length !== 6) return ''
  const year = spmon.slice(0, 4)
  const monthVal = spmon.slice(4, 6)
  const found = MONTHS.find(m => m.value === monthVal)
  return found ? `${found.text} ${year}` : spmon
}

const prevMonthLabel = computed(() => {
  if (items.value.length > 0 && items.value[0].SPMON) return formatSpmon(items.value[0].SPMON)
  const dateObj = new Date(filter.year, parseInt(filter.month, 10) - 1, 1)
  dateObj.setMonth(dateObj.getMonth() - 1)
  const found = MONTHS.find(m => m.value === String(dateObj.getMonth() + 1).padStart(2, '0'))
  return found ? `${found.text} ${dateObj.getFullYear()}` : 'Bulan Sebelumnya'
})

const currMonthLabel = computed(() => {
  if (items.value.length > 0 && items.value[0].SPMON1) return formatSpmon(items.value[0].SPMON1)
  const found = MONTHS.find(m => m.value === filter.month)
  return found ? `${found.text} ${filter.year}` : 'Bulan Sekarang'
})

const getKeteranganPrev = (item: any) => {
  if (!item) return '-'
  for (const f of [item.VBELN1, item.VBELN2]) {
    const val = (f || '').trim().toUpperCase()
    if (val.startsWith('C')) return 'Contract'
    if (val.startsWith('Q')) return 'Quotation'
    if (val.startsWith('S')) return 'Sales Order'
  }
  return '-'
}

const getKeteranganCurr = (item: any) => {
  if (!item) return '-'
  if (item.unit_status === 'Contract Rev 01' || item.unit_status === 'MDFO') return 'Contract Rev 01'
  if (item.unit_status === 'SO' || item.unit_status === 'Sales Order') return 'Sales Order'
  if (item.unit_status === 'Quotation') return 'Quotation'
  if (item.unit_status === 'Contract') return 'Contract'
  for (const f of [item.VBELN3, item.VBELN4]) {
    const val = (f || '').trim().toUpperCase()
    if (val.startsWith('C')) return 'Contract'
    if (val.startsWith('Q')) return 'Quotation'
    if (val.startsWith('S')) return 'Sales Order'
  }
  return '-'
}

const isCommonRow = (item: any) => {
  if (!item || !item.ZMODEL) return false
  return item.ZMODEL.toUpperCase().endsWith('COMMON')
}

// ==========================================
// FILTERING CONTRACT MODE
// ==========================================
const filteredItems = computed(() => {
  let list = normalizedItems.value
  if (filter.search) {
    const q = filter.search.toLowerCase().trim()
    list = list.filter(item => (
      (item.ZCUST && item.ZCUST.toLowerCase().includes(q)) ||
      (item.ZMODEL && item.ZMODEL.toLowerCase().includes(q)) ||
      (item.MATNR && item.MATNR.toLowerCase().includes(q)) ||
      (item.MATNR1 && item.MATNR1.toLowerCase().includes(q)) ||
      (item.BISMT && item.BISMT.toLowerCase().includes(q)) ||
      (item.BISMT1 && item.BISMT1.toLowerCase().includes(q)) ||
      (getKeteranganPrev(item).toLowerCase().includes(q)) ||
      (getKeteranganCurr(item).toLowerCase().includes(q))
    ))
  }

  Object.keys(contractColumnFilters).forEach(col => {
    const hidden = contractColumnFilters[col].hiddenValues
    if (hidden.length > 0) {
      list = list.filter(item => !hidden.includes(col === 'ZMODEL' ? (item.ZMODEL || '-') : (item[col] || '-')))
    }
  })

  let activeSortCol = '', activeSortOrder: 'asc' | 'desc' | '' = ''
  Object.keys(contractColumnFilters).forEach(col => {
    if (contractColumnFilters[col].sort) { activeSortCol = col; activeSortOrder = contractColumnFilters[col].sort }
  })

  if (activeSortCol && activeSortOrder) {
    list = [...list].sort((a, b) => {
      const valA = String(activeSortCol === 'ZMODEL' ? (a.ZMODEL || '-') : (a[activeSortCol] || '-'))
      const valB = String(activeSortCol === 'ZMODEL' ? (b.ZMODEL || '-') : (b[activeSortCol] || '-'))
      return activeSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })
  }
  return list
})

// ==========================================
// FILTERING QUOTATION MODE
// ==========================================
// ==========================================
// FILTERING QUOTATION MODE
// ==========================================
const filteredQuotationSummary  = computed(() => {
  let list = normalizedQuotationSummary.value

  if (filter.search) {
    const q = filter.search.toLowerCase().trim()
    list = list.filter(item => (
      (item.ZMODEL && item.ZMODEL.toLowerCase().includes(q)) ||
      (item.ZCUST && item.ZCUST.toLowerCase().includes(q))
    ))
  }

  Object.keys(quotationSummaryColumnFilters).forEach(col => {
    const hidden = quotationSummaryColumnFilters[col].hiddenValues
    if (hidden.length > 0) {
      list = list.filter(item => {
        const val = item[col] || '-'
        return !hidden.includes(val)
      })
    }
  })

  let activeSortCol = '', activeSortOrder: 'asc' | 'desc' | '' = ''
  Object.keys(quotationSummaryColumnFilters).forEach(col => {
    if (quotationSummaryColumnFilters[col].sort) { activeSortCol = col; activeSortOrder = quotationSummaryColumnFilters[col].sort }
  })

  if (activeSortCol && activeSortOrder) {
    list = [...list].sort((a, b) => {
      const valA = String(a[activeSortCol] || '-')
      const valB = String(b[activeSortCol] || '-')
      return activeSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })
  }
  return list
})

const filteredQuotationDetail   = computed(() => {
  let list = normalizedQuotationDetail.value

  if (filter.search) {
    const q = filter.search.toLowerCase().trim()
    list = list.filter(item => (
      (item.MATNR && item.MATNR.toLowerCase().includes(q)) ||
      (item.BISMT && item.BISMT.toLowerCase().includes(q)) ||
      (item.MAKTX && item.MAKTX.toLowerCase().includes(q)) ||
      (item.project && item.project.toLowerCase().includes(q)) ||
      (item.customer && item.customer.toLowerCase().includes(q))
    ))
  }

  Object.keys(quotationColumnFilters).forEach(col => {
    const hidden = quotationColumnFilters[col].hiddenValues
    if (hidden.length > 0) {
      list = list.filter(item => {
        const val = item[col] || '-'
        return !hidden.includes(val)
      })
    }
  })

  let activeSortCol = '', activeSortOrder: 'asc' | 'desc' | '' = ''
  Object.keys(quotationColumnFilters).forEach(col => {
    if (quotationColumnFilters[col].sort) { activeSortCol = col; activeSortOrder = quotationColumnFilters[col].sort }
  })

  if (activeSortCol && activeSortOrder) {
    list = [...list].sort((a, b) => {
      const valA = String(a[activeSortCol] || '-')
      const valB = String(b[activeSortCol] || '-')
      return activeSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })
  }
  return list
})


const filteredQuotations = computed(() => filteredQuotationDetail.value)

const toggleHeaderFilter = (mode: 'contract' | 'quotation' | 'quotationSummary', column: string) => {
  if (activeFilterDropdown.value?.mode === mode && activeFilterDropdown.value?.column === column) {
    activeFilterDropdown.value = null
  } else {
    activeFilterDropdown.value = { mode, column }
  }
}

const getUniqueValues = (mode: 'contract' | 'quotation' | 'quotationSummary', column: string): string[] => {
  let source: any[] = []
  if (mode === 'contract') {
    if (contractCycle.value === 'weekly') {
      source = weeklyDataNormalized.value
    } else {
      source = normalizedItems.value
    }
  }
  else if (mode === 'quotationSummary') source = normalizedQuotationSummary.value
  else source = normalizedQuotationDetail.value

  if (filter.search) {
    const q = filter.search.toLowerCase().trim()
    source = source.filter(item => (
      (item.ZCUST && item.ZCUST.toLowerCase().includes(q)) ||
      (item.ZMODEL && item.ZMODEL.toLowerCase().includes(q)) ||
      (item.MATNR && item.MATNR.toLowerCase().includes(q)) ||
      (item.MATNR1 && item.MATNR1.toLowerCase().includes(q)) ||
      (item.BISMT && item.BISMT.toLowerCase().includes(q)) ||
      (item.BISMT1 && item.BISMT1.toLowerCase().includes(q)) ||
      (item.MAKTX && item.MAKTX.toLowerCase().includes(q)) ||
      (item.customer && item.customer.toLowerCase().includes(q)) ||
      (item.model && item.model.toLowerCase().includes(q)) ||
      (item.project && item.project.toLowerCase().includes(q))
    ))
  }

  const filters = mode === 'contract' 
    ? contractColumnFilters 
    : (mode === 'quotationSummary' ? quotationSummaryColumnFilters : quotationColumnFilters)

  Object.keys(filters).forEach(col => {
    if (col === column) return

    const hidden = filters[col].hiddenValues

    if (hidden.length > 0) {
      source = source.filter(item => {
        const colKey = (mode === 'contract' && contractCycle.value === 'weekly')
          ? (col === 'ZCUST' ? 'customer' : col === 'ZMODEL' ? 'model' : col)
          : col
        const val = item[colKey] || '-'
        return !hidden.includes(val)
      })
    }
  })

  const set = new Set<string>()

  source.forEach(item => {
    const colKey = (mode === 'contract' && contractCycle.value === 'weekly')
      ? (column === 'ZCUST' ? 'customer' : column === 'ZMODEL' ? 'model' : column)
      : column
    const val = item[colKey] || '-'
    set.add(val)
  })

  return Array.from(set).sort()
}

const getFilteredUniqueValues = (mode: 'contract' | 'quotation' | 'quotationSummary', column: string): string[] => {
  const list = getUniqueValues(mode, column)
  const filters = mode === 'contract'
    ? contractColumnFilters
    : (mode === 'quotationSummary' ? quotationSummaryColumnFilters : quotationColumnFilters)
  const searchStr = filters[column]?.search
  if (!searchStr) return list
  return list.filter(v => v.toLowerCase().includes(searchStr.toLowerCase().trim()))
}

const isValueHidden = (mode: 'contract' | 'quotation' | 'quotationSummary', column: string, val: string) => {
  const filters = mode === 'contract'
    ? contractColumnFilters
    : (mode === 'quotationSummary' ? quotationSummaryColumnFilters : quotationColumnFilters)
  return filters[column]?.hiddenValues.includes(val)
}

const toggleValueHidden = (mode: 'contract' | 'quotation' | 'quotationSummary', column: string, val: string) => {
  const filters = mode === 'contract'
    ? contractColumnFilters
    : (mode === 'quotationSummary' ? quotationSummaryColumnFilters : quotationColumnFilters)
  const filterObj = filters[column]
  if (!filterObj) return
  const idx = filterObj.hiddenValues.indexOf(val)
  if (idx > -1) filterObj.hiddenValues.splice(idx, 1)
  else filterObj.hiddenValues.push(val)
}

const selectAllValues = (mode: 'contract' | 'quotation' | 'quotationSummary', column: string) => {
  const filters = mode === 'contract'
    ? contractColumnFilters
    : (mode === 'quotationSummary' ? quotationSummaryColumnFilters : quotationColumnFilters)
  const filterObj = filters[column]
  if (filterObj) filterObj.hiddenValues = []
}

const clearAllValues = (mode: 'contract' | 'quotation' | 'quotationSummary', column: string) => {
  const filters = mode === 'contract'
    ? contractColumnFilters
    : (mode === 'quotationSummary' ? quotationSummaryColumnFilters : quotationColumnFilters)
  const filterObj = filters[column]
  if (filterObj) {
    filterObj.hiddenValues = []
    filterObj.search = ''
    filterObj.sort = ''
  }
}

const selectOnlyThisValue = (mode: 'contract' | 'quotation' | 'quotationSummary', column: string, val: string) => {
  const filters = mode === 'contract'
    ? contractColumnFilters
    : (mode === 'quotationSummary' ? quotationSummaryColumnFilters : quotationColumnFilters)
  const filterObj = filters[column]
  if (!filterObj) return
  const allVals = getUniqueValues(mode, column)
  filterObj.hiddenValues = allVals.filter(v => v !== val)
}

const invertValues = (mode: 'contract' | 'quotation' | 'quotationSummary', column: string) => {
  const filters = mode === 'contract'
    ? contractColumnFilters
    : (mode === 'quotationSummary' ? quotationSummaryColumnFilters : quotationColumnFilters)
  const filterObj = filters[column]
  if (!filterObj) return
  const currentHidden = [...filterObj.hiddenValues]
  filterObj.hiddenValues = getUniqueValues(mode, column).filter(v => !currentHidden.includes(v))
}

const setColumnSort = (mode: 'contract' | 'quotation' | 'quotationSummary', column: string, order: 'asc' | 'desc') => {
  const filters = mode === 'contract'
    ? contractColumnFilters
    : (mode === 'quotationSummary' ? quotationSummaryColumnFilters : quotationColumnFilters)
  Object.keys(filters).forEach(k => { filters[k].sort = k === column ? order : '' })
}

const getItemGroupInfo = (item: any) => {
  const cust = (item.ZCUST || '').toUpperCase().trim()
  if (cust === 'ADM SAP' || cust === 'ADM KAP' || cust === 'TMMIN') return { id: 1, name: 'ADM SAP, ADM KAP & TMMIN' }
  if (cust === 'MMKI') return { id: 2, name: 'MMKI' }
  if (cust === 'HMMI') return { id: 3, name: 'HMMI' }
  if (cust === 'MKM') return { id: 4, name: 'MKM' }
  if (cust === 'HPM') return { id: 5, name: 'HPM' }
  if (cust === 'SIM') return { id: 6, name: 'SIM' }
  return { id: 7, name: 'Lain-lain' }
}

const tableRows = computed(() => {
  const list = filteredItems.value
  if (list.length === 0) return []

  const groups: Record<number, { name: string; items: any[] }> = {
    1: { name: 'ADM SAP, ADM KAP & TMMIN', items: [] },
    2: { name: 'MMKI', items: [] },
    3: { name: 'HMMI', items: [] },
    4: { name: 'MKM', items: [] },
    5: { name: 'HPM', items: [] },
    6: { name: 'SIM', items: [] },
    7: { name: 'Lain-lain', items: [] }
  }

  list.forEach(item => { groups[getItemGroupInfo(item).id].items.push(item) })

  const rawRows: any[] = []
  const grandTotalMetrics = { UMONTH: 0, UDAY: 0, UMONTH1: 0, UDAY1: 0, DIFF_UMONTH: 0, DIFF_UDAY: 0, MDFO: 0, SO: 0, MDFO1: 0, SO1: 0 }

  for (let id = 1; id <= 7; id++) {
    const grp = groups[id]
    if (grp.items.length === 0) continue

    grp.items.forEach(item => { rawRows.push({ ...item, isSubtotal: false, isGrandTotal: false }) })

    const itemsForTotal = id === 3 
      ? grp.items.filter(item => {
          const model = (item.ZMODEL || '').toUpperCase().trim()
          return model === 'SU2ID COMMON' || model === 'KS COMMON'
        })
      : grp.items

    const subUmonth = itemsForTotal.reduce((sum, item) => sum + (Number(item.UMONTH) || 0), 0)
    const subUday = itemsForTotal.reduce((sum, item) => sum + (Number(item.UDAY) || 0), 0)
    const subUmonth1 = itemsForTotal.reduce((sum, item) => sum + (Number(item.UMONTH1) || 0), 0)
    const subUday1 = itemsForTotal.reduce((sum, item) => sum + (Number(item.UDAY1) || 0), 0)
    const subMdfo = itemsForTotal.reduce((sum, item) => sum + (Number(item.MDFO) || 0), 0)
    const subSo = itemsForTotal.reduce((sum, item) => sum + (Number(item.SO) || 0), 0)
    const subMdfo1 = itemsForTotal.reduce((sum, item) => sum + (Number(item.MDFO1) || 0), 0)
    const subSo1 = itemsForTotal.reduce((sum, item) => sum + (Number(item.SO1) || 0), 0)
    const subDiffUmonth = itemsForTotal.reduce((sum, item) => sum + (Number(item.DIFF_UMONTH) || 0), 0)
    const subDiffUday   = itemsForTotal.reduce((sum, item) => sum + (Number(item.DIFF_UDAY) || 0), 0)
    const subPrsUmonth = subUmonth > 0 ? (subDiffUmonth / subUmonth) : 0
    const subPrsUday = subUday > 0 ? (subDiffUday / subUday) : 0

    const labelSuffix = id === 3 ? ' (SU2ID COMMON & KS COMMON)' : ''

    grandTotalMetrics.UMONTH += subUmonth
    grandTotalMetrics.UDAY += subUday
    grandTotalMetrics.UMONTH1 += subUmonth1
    grandTotalMetrics.UDAY1 += subUday1
    grandTotalMetrics.DIFF_UMONTH += subDiffUmonth
    grandTotalMetrics.DIFF_UDAY += subDiffUday
    grandTotalMetrics.MDFO += subMdfo
    grandTotalMetrics.SO += subSo
    grandTotalMetrics.MDFO1 += subMdfo1
    grandTotalMetrics.SO1 += subSo1

    rawRows.push({
      isSubtotal: true, isGrandTotal: false, ZCUST: `TOTAL ${grp.name.toUpperCase()}${labelSuffix}`, ZMODEL: '',
      UMONTH: subUmonth, UDAY: subUday, WDAY: '', UMONTH1: subUmonth1, UDAY1: subUday1, WDAY1: '',
      DIFF_UMONTH: subDiffUmonth, DIFF_UDAY: subDiffUday, PRS_UMONTH: subPrsUmonth, PRS_UDAY: subPrsUday,
      MDFO: subMdfo, SO: subSo, MDFO1: subMdfo1, SO1: subSo1
    })
  }

  if (rawRows.length > 0) {
    const grandPrsUmonth = grandTotalMetrics.UMONTH > 0 ? (grandTotalMetrics.DIFF_UMONTH / grandTotalMetrics.UMONTH) : 0
    const grandPrsUday = grandTotalMetrics.UDAY > 0 ? (grandTotalMetrics.DIFF_UDAY / grandTotalMetrics.UDAY) : 0
    rawRows.push({
      isSubtotal: false, isGrandTotal: true, ZCUST: 'TOTAL MAJ (UNIT)', ZMODEL: '',
      UMONTH: grandTotalMetrics.UMONTH, UDAY: grandTotalMetrics.UDAY, WDAY: '', UMONTH1: grandTotalMetrics.UMONTH1, UDAY1: grandTotalMetrics.UDAY1, WDAY1: '',
      DIFF_UMONTH: grandTotalMetrics.DIFF_UMONTH, DIFF_UDAY: grandTotalMetrics.DIFF_UDAY, PRS_UMONTH: grandPrsUmonth, PRS_UDAY: grandPrsUday,
      MDFO: grandTotalMetrics.MDFO, SO: grandTotalMetrics.SO, MDFO1: grandTotalMetrics.MDFO1, SO1: grandTotalMetrics.SO1
    })
  }

  const rowsWithSpan: any[] = []
  for (let i = 0; i < rawRows.length; i++) {
    const currentRow = rawRows[i]
    if (currentRow.isSubtotal || currentRow.isGrandTotal) {
      rowsWithSpan.push({ ...currentRow, showZcust: true, zcustSpan: 1 })
      continue
    }
    const isPrevSame = i > 0 && !rawRows[i - 1].isSubtotal && !rawRows[i - 1].isGrandTotal && rawRows[i - 1].ZCUST === currentRow.ZCUST
    if (isPrevSame) {
      rowsWithSpan.push({ ...currentRow, showZcust: false, zcustSpan: 0 })
    } else {
      let span = 1
      for (let j = i + 1; j < rawRows.length; j++) {
        if (rawRows[j].isSubtotal || rawRows[j].isGrandTotal || rawRows[j].ZCUST !== currentRow.ZCUST) break
        span++
      }
      rowsWithSpan.push({ ...currentRow, showZcust: true, zcustSpan: span })
    }
  }
  return rowsWithSpan
})

const quotationMonths = computed(() => {
  const year = Number(filter.year)
  const monthIdx = Number(filter.month) - 1
  const formatLabel = (d: Date) => `${MONTHS[d.getMonth()].text} ${d.getFullYear()}`
  return [
    { key: 1, label: formatLabel(new Date(year, monthIdx, 1)) },
    { key: 2, label: formatLabel(new Date(year, monthIdx + 1, 1)) },
    { key: 3, label: formatLabel(new Date(year, monthIdx + 2, 1)) }
  ]
})

// 1. Logika Pengelompokan Bersih khusus Tabel Atas (Quotation Summary Monitoring)
const quotationSummaryRows = computed(() => {
  const list = filteredQuotationSummary.value
  if (list.length === 0) return []

  const groups: Record<number, { name: string; items: any[] }> = {
    1: { name: 'ADM SAP, ADM KAP & TMMIN', items: [] },
    2: { name: 'MMKI', items: [] },
    3: { name: 'HMMI', items: [] },
    4: { name: 'MKM', items: [] },
    5: { name: 'HPM', items: [] },
    6: { name: 'SIM', items: [] },
    7: { name: 'Lain-lain', items: [] }
  }

  list.forEach(item => { groups[getItemGroupInfo(item).id].items.push(item) })

  const rawRows: any[] = []
  const grandTotal = { q1: 0, q2: 0, q3: 0 }

  for (let id = 1; id <= 7; id++) {
    const grp = groups[id]
    if (grp.items.length === 0) continue

    // Kelompokkan data per Model unik dalam grup customer tersebut agar ringkas
    const modelGroupMap: Record<string, { ZCUST: string; ZMODEL: string; q1: number; q2: number; q3: number }> = {}
    
    grp.items.forEach(item => {
      const key = `${item.ZCUST}_${item.ZMODEL}`
      if (!modelGroupMap[key]) {
        modelGroupMap[key] = { ZCUST: item.ZCUST, ZMODEL: item.ZMODEL, q1: 0, q2: 0, q3: 0 }
      }
      modelGroupMap[key].q1 += Number(item.KWMENG_ZQUOT1) || 0
      modelGroupMap[key].q2 += Number(item.KWMENG_ZQUOT2) || 0
      modelGroupMap[key].q3 += Number(item.KWMENG_ZQUOT3) || 0
    })

    let subQ1 = 0, subQ2 = 0, subQ3 = 0
    Object.values(modelGroupMap).forEach(row => {
      rawRows.push({
        isSubtotal: false, isGrandTotal: false,
        ZCUST: row.ZCUST, ZMODEL: row.ZMODEL,
        KWMENG_ZQUOT1: row.q1, KWMENG_ZQUOT2: row.q2, KWMENG_ZQUOT3: row.q3
      })
      if (id !== 3 || row.ZMODEL.toUpperCase().includes('COMMON')) {
        subQ1 += row.q1; subQ2 += row.q2; subQ3 += row.q3
      }
    })

    grandTotal.q1 += subQ1; grandTotal.q2 += subQ2; grandTotal.q3 += subQ3

    const labelSuffix = id === 3 ? ' (SU2ID COMMON & KS COMMON)' : ''
    rawRows.push({
      isSubtotal: true, isGrandTotal: false,
      ZCUST: `TOTAL ${grp.name.toUpperCase()}${labelSuffix}`, ZMODEL: '',
      KWMENG_ZQUOT1: subQ1, KWMENG_ZQUOT2: subQ2, KWMENG_ZQUOT3: subQ3
    })
  }

  if (rawRows.length > 0) {
    rawRows.push({
      isSubtotal: false, isGrandTotal: true,
      ZCUST: 'TOTAL MAJ (UNIT)', ZMODEL: '',
      KWMENG_ZQUOT1: grandTotal.q1, KWMENG_ZQUOT2: grandTotal.q2, KWMENG_ZQUOT3: grandTotal.q3
    })
  }

  // Inject span customer group
  const rowsWithSpan: any[] = []
  for (let i = 0; i < rawRows.length; i++) {
    const currentRow = rawRows[i]
    if (currentRow.isSubtotal || currentRow.isGrandTotal) {
      rowsWithSpan.push({ ...currentRow, showZcust: true, zcustSpan: 1 })
      continue
    }
    const isPrevSame = i > 0 && !rawRows[i - 1].isSubtotal && !rawRows[i - 1].isGrandTotal && rawRows[i - 1].ZCUST === currentRow.ZCUST
    if (isPrevSame) {
      rowsWithSpan.push({ ...currentRow, showZcust: false, zcustSpan: 0 })
    } else {
      let span = 1
      for (let j = i + 1; j < rawRows.length; j++) {
        if (rawRows[j].isSubtotal || rawRows[j].isGrandTotal || rawRows[j].ZCUST !== currentRow.ZCUST) break
        span++
      }
      rowsWithSpan.push({ ...currentRow, showZcust: true, zcustSpan: span })
    }
  }
  return rowsWithSpan
})

// 2. Logika Los Bersendiri khusus Tabel Detail (Bongkar All Customer & All Part Mentah Baris Per Baris)
const quotationTableRows = computed(() => {
  const list = filteredQuotationDetail.value

  if (list.length === 0) return []

  const map: Record<string, any> = {}

  list.forEach(item => {
    const customer = item.customer || '-'
    const matnr = item.MATNR || '-'
    const jobNumber = item.job_number || '-'
    const project = item.project || '-'
    const projectDetail = item.project_detail || '-'

    const key = `${customer}_${matnr}_${jobNumber}_${project}_${projectDetail}`

    if (!map[key]) {
      map[key] = {
        isGrandTotal: false,
        customer,
        MATNR: matnr,
        job_number: jobNumber,
        project,
        project_detail: projectDetail,
        KWMENG_ZQUOT1: 0,
        KWMENG_ZQUOT2: 0,
        KWMENG_ZQUOT3: 0
      }
    }

    const qty = Number(item.KWMENG) || 0

    if (Number(item.monthIndex) === 1) {
      map[key].KWMENG_ZQUOT1 += qty
    }

    if (Number(item.monthIndex) === 2) {
      map[key].KWMENG_ZQUOT2 += qty
    }

    if (Number(item.monthIndex) === 3) {
      map[key].KWMENG_ZQUOT3 += qty
    }
  })

  const rows = Object.values(map)

  const grandTotal = rows.reduce(
    (total, item) => {
      total.q1 += Number(item.KWMENG_ZQUOT1) || 0
      total.q2 += Number(item.KWMENG_ZQUOT2) || 0
      total.q3 += Number(item.KWMENG_ZQUOT3) || 0
      return total
    },
    { q1: 0, q2: 0, q3: 0 }
  )

  rows.push({
    isGrandTotal: true,
    customer: 'TOTAL MAJ (UNIT)',
    MATNR: '',
    job_number: '',
    project: '',
    project_detail: '',
    KWMENG_ZQUOT1: grandTotal.q1,
    KWMENG_ZQUOT2: grandTotal.q2,
    KWMENG_ZQUOT3: grandTotal.q3
  })

  return rows
})

// Logika Pemotongan Halaman Paginasi untuk View Detail Granular
const totalQuotationPages = computed(() => {
  if (filter.perPage === 'All') return 1
  const dataRows = quotationTableRows.value.filter(r => !r.isGrandTotal)
  return Math.max(1, Math.ceil(dataRows.length / Number(filter.perPage)))
})

const paginatedQuotationRows = computed(() => {
  const allRows = quotationTableRows.value
  if (filter.perPage === 'All') return allRows

  const dataRows = allRows.filter(r => !r.isGrandTotal)
  const perPage = Number(filter.perPage)
  const start = (currentPage.value - 1) * perPage
  const pageRows = dataRows.slice(start, start + perPage)

  if (currentPage.value === totalQuotationPages.value) {
    const totalRow = allRows.find(r => r.isGrandTotal)
    if (totalRow) pageRows.push(totalRow)
  }
  return pageRows
})

const goToPrevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const goToNextPage = () => { if (currentPage.value < totalQuotationPages.value) currentPage.value++ }

const quotationGrandTotalData = computed(() => quotationSummaryRows.value.find(r => r.isGrandTotal) || { KWMENG_ZQUOT1: 0, KWMENG_ZQUOT2: 0, KWMENG_ZQUOT3: 0 })
const grandTotalData = computed(() => tableRows.value.find(r => r.isGrandTotal) || { UMONTH: 0, UMONTH1: 0, DIFF_UMONTH: 0, PRS_UMONTH: 0, DIFF_UDAY: 0, PRS_UDAY: 0 })

const currentPeriodString = computed(() => {
  const y = new Date().getFullYear()
  const m = String(new Date().getMonth() + 1).padStart(2, '0')
  return `${y}${m}`
})

const isPrevMonthPast = (item: any) => {
  const spmon = item.SPMON || ''
  return !!(spmon && spmon < currentPeriodString.value)
}

const isCurrMonthPast = (item: any) => {
  const spmon1 = item.SPMON1 || ''
  return !!(spmon1 && spmon1 < currentPeriodString.value)
}

const isPrevDiff = (item: any) => {
  if (item.isSubtotal || item.isGrandTotal) return false
  if (isPrevMonthPast(item)) {
    return Number(item.UMONTH) !== Number(item.SO)
  }
  return Number(item.UMONTH) !== Number(item.MDFO)
}

const isCurrDiff = (item: any) => {
  if (item.isSubtotal || item.isGrandTotal) return false
  if (isCurrMonthPast(item)) {
    return Number(item.UMONTH1) !== Number(item.SO1)
  }
  return Number(item.UMONTH1) !== Number(item.MDFO1)
}

const formatNumber = (value: any) => {
  if (value === null || value === undefined || value === '') return '0'
  const n = Math.round(Number(value) || 0)
  return n === 0 ? '0' : n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const formatDecimal = (value: any) => (value === null || value === undefined || value === '') ? '0' : Math.round(Number(value) || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const formatPercent = (value: any) => (value === null || value === undefined || value === '') ? '0,0%' : `${(Number(value) * 100).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
const formatWorkingDay = (value: any) => (value === null || value === undefined || value === '') ? '-' : (isNaN(Number(value)) ? value : Number(value).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 }))

const getPercentTrend = (value: any) => {
  const n = Number(value) || 0
  if (n > 0) return { arrow: '▲', textClass: 'text-emerald-600', bgClass: 'bg-emerald-50' }
  if (n < 0) return { arrow: '▼', textClass: 'text-rose-600', bgClass: 'bg-rose-50' }
  return { arrow: '➜', textClass: 'text-amber-500', bgClass: 'bg-amber-50' }
}

const getVolumeTrend = (currentVol: any, nextVol: any) => {
  const c = Number(currentVol) || 0
  const n = Number(nextVol) || 0
  if (c === 0 && n === 0) return { arrow: '', textClass: '', text: '' }
  
  const diff = n - c
  let pct = 0
  if (c !== 0) {
    pct = (diff / c) * 100
  } else {
    pct = n > 0 ? 100 : -100
  }
  
  if (n > c) {
    return {
      arrow: '▲',
      textClass: 'text-emerald-600 font-semibold',
      text: `▲${Math.abs(pct).toFixed(1)}%`
    }
  }
  if (n < c) {
    return {
      arrow: '▼',
      textClass: 'text-rose-600 font-semibold',
      text: `▼${Math.abs(pct).toFixed(1)}%`
    }
  }
  return {
    arrow: '➜',
    textClass: 'text-amber-500 font-semibold',
    text: `0%`
  }
}

const exportExcel = () => {
  const params = new URLSearchParams({
    period: formattedPeriod.value,
    spmon: formattedPeriod.value,
    month: formattedPeriod.value,
    periode: formattedPeriod.value
  }).toString()
  window.open(`http://192.168.10.67/majsf_rest_api/api/Report_delivery/download_excel_recap?${params}`, '_blank')
}


const exportExcelQuot = () => {
  if (quotationTableRows.value.length === 0) return
  const headerRow1 = ['No', 'Customer', 'Part Number', 'Job Number', 'Model', 'Sub Model', quotationMonths.value[0].label, quotationMonths.value[1].label, quotationMonths.value[2].label]
  const dataRows = quotationTableRows.value.map((item, idx) => [
    item.isGrandTotal ? '' : (idx + 1),
    item.customer || '',
    item.isGrandTotal ? '' : (item.MATNR || ''),
    item.isGrandTotal ? '' : (item.job_number || ''),
    item.isGrandTotal ? '' : (item.project || ''),
    item.isGrandTotal ? '' : (item.project_detail || ''),
    Number(item.KWMENG_ZQUOT1) || 0,
    Number(item.KWMENG_ZQUOT2) || 0,
    Number(item.KWMENG_ZQUOT3) || 0
  ])
  const ws = XLSX.utils.aoa_to_sheet([headerRow1, ...dataRows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Quotation_Compare')
  XLSX.writeFile(wb, `Quotation_Monitoring_${formattedPeriod.value}.xlsx`)
}
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-4" />

  <div class="flex flex-col gap-2">
    <v-card class="pa-6 rounded-lg mb-0 elevation-2 w-full bg-white">
      <div class="flex justify-between items-center mb-4">
        <div>
          <div class="text-h5 font-weight-medium mb-1 text-slate-800">Filter Pencarian &amp; Periode</div>
          <div class="text-body-2 text-grey-darken-1">Pilih bulan, tahun, and mode monitoring untuk menyaring data.</div>
        </div>
      </div>
      <v-divider class="my-4" />
      <v-row dense align="center" class="justify-between w-full">
        <v-col class="flex items-center gap-3 flex-wrap grow">
          <div style="width: 240px; flex-shrink: 0;">
            <v-select
              v-model="currentMode"
              :items="[
                { text: 'Contract Mode', value: 'contract' },
                { text: 'Quotation Mode', value: 'quotation' }
              ]"
              item-title="text"
              item-value="value"
              label="Mode Monitoring"
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="currentPage = 1"
            />
          </div>
          <div v-if="currentMode === 'contract'" style="width: 160px; flex-shrink: 0;">
            <v-select
              v-model="contractCycle"
              :items="[
                { text: 'Monthly', value: 'monthly' },
                { text: 'Weekly', value: 'weekly' }
              ]"
              item-title="text"
              item-value="value"
              label="Format Periode"
              variant="outlined"
              density="compact"
              hide-details
            />
          </div>
          <div style="width: 185px; flex-shrink: 0;">
            <v-select v-model="filter.month" :items="MONTHS" item-title="text" item-value="value" label="Bulan" variant="outlined" density="compact" prepend-inner-icon="mdi-calendar" hide-details />
          </div>
          <div style="width: 130px; flex-shrink: 0;">
            <v-select v-model="filter.year" :items="YEARS" label="Tahun" variant="outlined" density="compact" hide-details class="text-center-input" />
          </div>
          <div style="flex-grow: 1; min-width: 240px;">
            <v-text-field v-model="filter.search" label="Cari Part / Model / Customer" variant="outlined" density="compact" prepend-inner-icon="mdi-magnify" hide-details clearable />
          </div>
        </v-col>
        <v-col cols="auto" class="flex items-center gap-2">
          <v-btn color="primary" prepend-icon="mdi-database-search" class="px-4 text-white font-weight-medium" :loading="loading" @click="loadData(true)" style="height: 40px;">Load Data</v-btn>
          <v-btn color="#1D6F42" prepend-icon="mdi-file-excel" class="px-4 text-white font-weight-medium" @click="currentMode === 'contract' ? (contractCycle === 'weekly' ? exportExcelWeekly() : exportExcel()) : exportExcelQuot()" :disabled="currentMode === 'contract' ? (contractCycle === 'weekly' ? weeklyTableRows.length === 0 : filteredItems.length === 0) : quotationTableRows.length === 0" style="height: 40px;">Excel</v-btn>
        </v-col>
      </v-row>
    </v-card>

    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 w-full" v-if="currentMode === 'contract' && contractCycle === 'monthly' && filteredItems.length > 0">
      <div class="bg-white p-4 md:p-5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">Total Item Part</p>
          <h4 class="text-lg font-bold text-gray-800">{{ formatNumber(filteredItems.length) }}</h4>
        </div>
      </div>
      <div class="bg-white p-4 md:p-5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">Total Vol ({{ prevMonthLabel }})</p>
          <h4 class="text-lg font-bold text-gray-800">{{ formatNumber(grandTotalData.UMONTH) }}</h4>
        </div>
      </div>
      <div class="bg-white p-4 md:p-5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">Total Vol ({{ currMonthLabel }})</p>
          <h4 class="text-lg font-bold text-gray-800">{{ formatNumber(grandTotalData.UMONTH1) }}</h4>
        </div>
      </div>
      <div class="bg-white p-4 md:p-5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" :class="grandTotalData.DIFF_UMONTH >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'">
          <svg v-if="grandTotalData.DIFF_UMONTH >= 0" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" /></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">DIFF U/Month %</p>
          <h4 class="text-lg font-bold" :class="grandTotalData.DIFF_UMONTH >= 0 ? 'text-emerald-600' : 'text-rose-600'">
            {{ grandTotalData.DIFF_UMONTH >= 0 ? '+' : '' }}{{ formatNumber(grandTotalData.DIFF_UMONTH) }} ({{ formatPercent(grandTotalData.PRS_UMONTH) }})
          </h4>
        </div>
      </div>
      <div class="bg-white p-4 md:p-5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" :class="grandTotalData.DIFF_UDAY >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'">
          <svg v-if="grandTotalData.DIFF_UDAY >= 0" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" /></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">DIFF U/Day %</p>
          <h4 class="text-lg font-bold" :class="grandTotalData.DIFF_UDAY >= 0 ? 'text-emerald-600' : 'text-rose-600'">
            {{ grandTotalData.DIFF_UDAY >= 0 ? '+' : '' }}{{ formatNumber(grandTotalData.DIFF_UDAY) }} ({{ formatPercent(grandTotalData.PRS_UDAY) }})
          </h4>
        </div>
      </div>
    </div>

    <!-- Cards for Weekly Contract Mode -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 w-full" v-else-if="currentMode === 'contract' && contractCycle === 'weekly' && weeklyDataFiltered.length > 0">
      <div class="bg-white p-4 md:p-5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">Total Item Part</p>
          <h4 class="text-lg font-bold text-gray-800">{{ formatNumber(weeklyDataFiltered.length) }}</h4>
        </div>
      </div>
      <div class="bg-white p-4 md:p-5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">Total Vol ({{ prevMonthLabel }})</p>
          <h4 class="text-xs md:text-sm font-bold text-gray-800">P: {{ formatNumber(weeklyGrandTotals.prevTotalForecast) }} <span class="text-gray-300 mx-1">|</span> A: {{ formatNumber(weeklyGrandTotals.prevTotalSo) }}</h4>
        </div>
      </div>
      <div class="bg-white p-4 md:p-5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">Total Vol ({{ currMonthLabel }})</p>
          <h4 class="text-xs md:text-sm font-bold text-gray-800">P: {{ formatNumber(weeklyGrandTotals.currTotalForecast) }} <span class="text-gray-300 mx-1">|</span> A: {{ formatNumber(weeklyGrandTotals.currTotalSo) }}</h4>
        </div>
      </div>
      <div class="bg-white p-4 md:p-5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">Minggu Tertinggi</p>
          <h4 class="text-lg font-bold text-emerald-600">
            {{ weeklyGrandTotals.maxWeek }}
          </h4>
        </div>
      </div>
      <div class="bg-white p-4 md:p-5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" /></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">Minggu Terendah</p>
          <h4 class="text-lg font-bold text-rose-600">
            {{ weeklyGrandTotals.minWeek }}
          </h4>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 w-full" v-if="currentMode === 'quotation' && filteredQuotationDetail.length > 0">
      <div class="bg-white p-4 md:p-5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">Total Item Part</p>
          <h4 class="text-lg font-bold text-gray-800">{{ formatNumber(filteredQuotationDetail.length) }}</h4>
        </div>
      </div>
      <div class="bg-white p-4 md:p-5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">Total Vol ({{ quotationMonths[0]?.label }})</p>
          <h4 class="text-lg font-bold text-gray-800">{{ formatNumber(quotationGrandTotalData.KWMENG_ZQUOT1) }}</h4>
        </div>
      </div>
      <div class="bg-white p-4 md:p-5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">Total Vol ({{ quotationMonths[1]?.label }})</p>
          <h4 class="text-lg font-bold text-gray-800">{{ formatNumber(quotationGrandTotalData.KWMENG_ZQUOT2) }}</h4>
        </div>
      </div>
      <div class="bg-white p-4 md:p-5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">Total Vol ({{ quotationMonths[2]?.label }})</p>
          <h4 class="text-lg font-bold text-gray-800">{{ formatNumber(quotationGrandTotalData.KWMENG_ZQUOT3) }}</h4>
        </div>
      </div>
    </div>

    <v-card v-if="currentMode === 'quotation' && filteredQuotationDetail.length > 0 && !loading" class="pa-5 rounded-lg mb-2 elevation-2 w-full bg-white">
      <div class="text-h6 text-primary font-weight-medium mb-3">Quotation Summary Monitoring</div>
      <div class="table-fullview-container rounded-lg border">
        <table class="w-full text-xs text-gray-700 font-medium custom-table table-auto-layout quot-summary-table">
          <thead>
            <tr class="bg-slate-800 text-white font-semibold text-center text-[12px]">
              <th class="bg-slate-800 text-center relative text-white py-2 w-[16%]">
                <div class="flex justify-center items-center gap-1 px-1">
                  <span>Customer</span>
                  <button @click.stop="toggleHeaderFilter('quotationSummary', 'ZCUST')" class="text-slate-400 hover:text-white focus:outline-none">▼</button>
                </div>
                <div v-if="activeFilterDropdown?.mode === 'quotationSummary' && activeFilterDropdown?.column === 'ZCUST'" @click.stop class="excel-dropdown-panel text-gray-800">
                  <div class="font-bold border-b pb-1 mb-1 text-gray-500 text-[9px] uppercase tracking-wider">Excel Filter: Cust</div>
                  <button @click="setColumnSort('quotationSummary', 'ZCUST', 'asc')" class="excel-sort-btn">🔼 Sort Ascending</button>
                  <button @click="setColumnSort('quotationSummary', 'ZCUST', 'desc')" class="excel-sort-btn border-b mb-1 pb-1">🔽 Sort Descending</button>
                  <input v-model="quotationSummaryColumnFilters.ZCUST.search" type="text" placeholder="Cari..." class="excel-search-input" />
                  <div class="excel-checklist-container">
                    <label v-for="val in getFilteredUniqueValues('quotationSummary', 'ZCUST')" :key="val" class="excel-checkbox-label group flex items-center justify-between hover:bg-slate-50 px-1 rounded">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <input type="checkbox" :checked="!isValueHidden('quotationSummary', 'ZCUST', val)" @change="toggleValueHidden('quotationSummary', 'ZCUST', val)" class="w-3 h-3 text-blue-600 rounded shrink-0 cursor-pointer" />
                        <span class="truncate">{{ val || '(Blank)' }}</span>
                      </div>
                      <button @click.stop="selectOnlyThisValue('quotationSummary', 'ZCUST', val)" title="Hanya pilih item ini" class="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-semibold shrink-0 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">Only</button>
                    </label>
                  </div>
                  <div class="excel-actions-footer">
                    <button @click="selectAllValues('quotationSummary', 'ZCUST')" class="text-blue-600 hover:underline">Select All</button>
                    <button @click="invertValues('quotationSummary', 'ZCUST')" class="text-blue-600 hover:underline">Invert</button>
                    <button @click="clearAllValues('quotationSummary', 'ZCUST')" class="text-rose-600 hover:underline">Clear</button>
                  </div>
                </div>
              </th>
              <th class="bg-slate-800 text-center relative text-white py-2 w-[16%]">
                <div class="flex justify-center items-center gap-1 px-1">
                  <span>Model</span>
                  <button @click.stop="toggleHeaderFilter('quotationSummary', 'ZMODEL')" class="text-slate-400 hover:text-white focus:outline-none">▼</button>
                </div>
                <div v-if="activeFilterDropdown?.mode === 'quotationSummary' && activeFilterDropdown?.column === 'ZMODEL'" @click.stop class="excel-dropdown-panel text-gray-800">
                  <div class="font-bold border-b pb-1 mb-1 text-gray-500 text-[9px] uppercase tracking-wider">Excel Filter: Model</div>
                  <button @click="setColumnSort('quotationSummary', 'ZMODEL', 'asc')" class="excel-sort-btn">🔼 Sort Ascending</button>
                  <button @click="setColumnSort('quotationSummary', 'ZMODEL', 'desc')" class="excel-sort-btn border-b mb-1 pb-1">🔽 Sort Descending</button>
                  <input v-model="quotationSummaryColumnFilters.ZMODEL.search" type="text" placeholder="Cari..." class="excel-search-input" />
                  <div class="excel-checklist-container">
                    <label v-for="val in getFilteredUniqueValues('quotationSummary', 'ZMODEL')" :key="val" class="excel-checkbox-label group flex items-center justify-between hover:bg-slate-50 px-1 rounded">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <input type="checkbox" :checked="!isValueHidden('quotationSummary', 'ZMODEL', val)" @change="toggleValueHidden('quotationSummary', 'ZMODEL', val)" class="w-3 h-3 text-blue-600 rounded shrink-0 cursor-pointer" />
                        <span class="truncate">{{ val || '(Blank)' }}</span>
                      </div>
                      <button @click.stop="selectOnlyThisValue('quotationSummary', 'ZMODEL', val)" title="Hanya pilih item ini" class="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-semibold shrink-0 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">Only</button>
                    </label>
                  </div>
                  <div class="excel-actions-footer">
                    <button @click="selectAllValues('quotationSummary', 'ZMODEL')" class="text-blue-600 hover:underline">Select All</button>
                    <button @click="invertValues('quotationSummary', 'ZMODEL')" class="text-blue-600 hover:underline">Invert</button>
                    <button @click="clearAllValues('quotationSummary', 'ZMODEL')" class="text-rose-600 hover:underline">Clear</button>
                  </div>
                </div>
              </th>
              <th class="bg-slate-700 text-white py-2 w-[22%]">Quotation {{ quotationMonths[0]?.label }}</th>
              <th class="bg-slate-700 text-white py-2 w-[22%]">Quotation {{ quotationMonths[1]?.label }}</th>
              <th class="bg-slate-900 text-white py-2 w-[24%]">Quotation {{ quotationMonths[2]?.label }}</th>
            </tr>
          </thead>
          <tbody class="bg-white">
            <tr v-for="(item, index) in quotationSummaryRows" :key="index" :class="[
                item.isSubtotal ? 'bg-slate-100 font-bold text-gray-900' : '',
                item.isGrandTotal ? 'bg-slate-200 font-extrabold text-blue-950' : '',
                (!item.isSubtotal && !item.isGrandTotal) ? 'row-hoverable transition-colors' : ''
              ]">
              <td v-if="item.showZcust" :colspan="item.isSubtotal || item.isGrandTotal ? 2 : 1" :rowspan="item.isGrandTotal ? 1 : item.zcustSpan" :class="[
                  item.isSubtotal ? 'text-left pl-2 text-blue-900 bg-blue-50/40 font-bold' : '',
                  item.isGrandTotal ? 'text-left pl-2 text-blue-950 bg-slate-200 font-extrabold' : '',
                  (!item.isSubtotal && !item.isGrandTotal) ? 'font-medium text-gray-900 bg-white text-center' : ''
                ]" class="whitespace-nowrap align-middle cell-padding">
                {{ item.ZCUST || '-' }}
              </td>
              <td v-if="!item.isSubtotal && !item.isGrandTotal" class="text-center text-blue-600 cursor-pointer hover:underline whitespace-nowrap cell-padding" @click="openModelDetails(item)">
                {{ item.ZMODEL || '-' }}
              </td>
              <td class="text-right whitespace-nowrap font-medium text-gray-900 cell-padding" :class="item.isGrandTotal ? 'bg-slate-200 text-blue-950' : ''">{{ formatNumber(item.KWMENG_ZQUOT1) }}</td>
              <td class="text-right whitespace-nowrap font-medium text-gray-900 cell-padding" :class="item.isGrandTotal ? 'bg-slate-200 text-blue-950' : ''">
                <div class="flex items-center justify-end gap-1">
                  <span>{{ formatNumber(item.KWMENG_ZQUOT2) }}</span>
                  <span v-if="getVolumeTrend(item.KWMENG_ZQUOT1, item.KWMENG_ZQUOT2).text" :class="getVolumeTrend(item.KWMENG_ZQUOT1, item.KWMENG_ZQUOT2).textClass" class="text-[9px] ml-0.5 opacity-90">
                    ({{ getVolumeTrend(item.KWMENG_ZQUOT1, item.KWMENG_ZQUOT2).text }})
                  </span>
                </div>
              </td>
              <td class="text-right whitespace-nowrap font-bold text-blue-950 bg-blue-50/10 cell-padding" :class="item.isGrandTotal ? 'bg-slate-200 text-blue-950' : ''">
                <div class="flex items-center justify-end gap-1">
                  <span>{{ formatNumber(item.KWMENG_ZQUOT3) }}</span>
                  <span v-if="getVolumeTrend(item.KWMENG_ZQUOT2, item.KWMENG_ZQUOT3).text" :class="getVolumeTrend(item.KWMENG_ZQUOT2, item.KWMENG_ZQUOT3).textClass" class="text-[9px] ml-0.5 opacity-90">
                    ({{ getVolumeTrend(item.KWMENG_ZQUOT2, item.KWMENG_ZQUOT3).text }})
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </v-card>

    <v-card class="pa-5 rounded-lg mb-6 elevation-2 w-full bg-white">
      <div class="flex justify-between items-center mb-2">
        <div class="text-h5 text-primary font-weight-medium">
          {{ currentMode === 'contract' ? (contractCycle === 'weekly' ? 'Forecast Unit/Week' : 'Contract Detail Monitoring') : 'Quotation Detail Monitoring' }}
        </div>
        <div v-if="currentMode === 'quotation'" class="flex items-center gap-2">
          <div style="width: 150px;">
            <v-select v-model="filter.perPage" :items="[{ text: '10 Baris', value: '10' }, { text: '30 Baris', value: '30' }, { text: '50 Baris', value: '50' }, { text: 'Semua Data', value: 'All' }]" item-title="text" item-value="value" label="Tampilkan Baris" variant="outlined" density="compact" hide-details />
          </div>
          <v-btn color="#1D6F42" prepend-icon="mdi-file-excel" class="px-4 text-white font-weight-medium" @click="exportExcelQuot" :disabled="quotationTableRows.length === 0" style="height: 40px;">Excel</v-btn>
        </div>
      </div>


      <!-- Weekly Legend: P = Plan (Forecast), A = Actual (Sales Order), % = Percentage Diff -->
      <div v-if="currentMode === 'contract' && contractCycle === 'weekly' && !loading && weeklyDataFiltered.length > 0" class="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 mb-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-gray-700 shadow-sm w-fit">
        <span class="font-bold flex items-center gap-1.5"><v-icon size="16" class="text-slate-500">mdi-information-outline</v-icon> Keterangan:</span>
        <div class="flex items-center gap-1.5">
          <span class="px-1.5 py-0.5 rounded bg-slate-200 font-bold text-gray-800">P</span>
          <span>= Plan (Forecast)</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="px-1.5 py-0.5 rounded bg-slate-200 font-bold text-gray-800">A</span>
          <span>= Actual (Sales Order)</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="px-1.5 py-0.5 rounded bg-slate-200 font-bold text-gray-800">%</span>
          <span>= Selisih Persentase (A vs P)</span>
        </div>
      </div>

      <div v-if="loading" class="flex flex-col items-center justify-center py-14 gap-2">
        <v-progress-circular indeterminate size="32" width="3" color="primary" />
        <p class="text-xs text-gray-500 font-medium mt-2">Memuat data dari sistem SAP...</p>
      </div>

      <div v-else-if="(currentMode === 'contract' && tableRows.length === 0) || (currentMode === 'quotation' && quotationTableRows.length === 0)" class="flex flex-col items-center justify-center py-14 text-center px-4">
        <h6 class="text-xs font-semibold text-gray-800">Tidak Ada Data Ditemukan</h6>
      </div>
      <div v-else class="table-fullview-container rounded-lg border contract-table-el">
        <table v-if="currentMode === 'contract' && contractCycle === 'monthly'" class="w-full text-xs text-gray-700 font-medium custom-table table-auto-layout contract-table-detail">
          <thead>
            <tr class="bg-slate-800 text-white font-semibold text-center text-[11px]">
              <th rowspan="2" class="bg-slate-800 text-center relative text-white py-1 w-[8%]">
                <div class="flex justify-center items-center gap-1 px-1">
                  <span>Customer</span>
                  <button @click.stop="toggleHeaderFilter('contract', 'ZCUST')" class="text-slate-400 hover:text-white focus:outline-none">▼</button>
                </div>
                <div v-if="activeFilterDropdown?.mode === 'contract' && activeFilterDropdown?.column === 'ZCUST'" @click.stop class="excel-dropdown-panel text-gray-800">
                  <div class="font-bold border-b pb-1 mb-1 text-gray-500 text-[9px] uppercase tracking-wider">Excel Filter: Cust</div>
                  <button @click="setColumnSort('contract', 'ZCUST', 'asc')" class="excel-sort-btn">🔼 Sort Ascending</button>
                  <button @click="setColumnSort('contract', 'ZCUST', 'desc')" class="excel-sort-btn border-b mb-1 pb-1">🔽 Sort Descending</button>
                  <input v-model="contractColumnFilters.ZCUST.search" type="text" placeholder="Cari..." class="excel-search-input" />
                  <div class="excel-checklist-container">
                    <label v-for="val in getFilteredUniqueValues('contract', 'ZCUST')" :key="val" class="excel-checkbox-label group flex items-center justify-between hover:bg-slate-50 px-1 rounded">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <input type="checkbox" :checked="!isValueHidden('contract', 'ZCUST', val)" @change="toggleValueHidden('contract', 'ZCUST', val)" class="w-3 h-3 text-blue-600 rounded shrink-0 cursor-pointer" />
                        <span class="truncate">{{ val || '(Blank)' }}</span>
                      </div>
                      <button @click.stop="selectOnlyThisValue('contract', 'ZCUST', val)" title="Hanya pilih item ini" class="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-semibold shrink-0 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">Only</button>
                    </label>
                  </div>
                  <div class="excel-actions-footer">
                    <button @click="selectAllValues('contract', 'ZCUST')" class="text-blue-600 hover:underline">Select All</button>
                    <button @click="invertValues('contract', 'ZCUST')" class="text-blue-600 hover:underline">Invert</button>
                    <button @click="clearAllValues('contract', 'ZCUST')" class="text-rose-600 hover:underline">Clear</button>
                  </div>
                </div>
              </th>
              <th rowspan="2" class="bg-slate-800 text-center relative text-white py-1 w-[10%]">
                <div class="flex justify-center items-center gap-1 px-1">
                  <span>Model</span>
                  <button @click.stop="toggleHeaderFilter('contract', 'ZMODEL')" class="text-slate-400 hover:text-white focus:outline-none">▼</button>
                </div>
                <div v-if="activeFilterDropdown?.mode === 'contract' && activeFilterDropdown?.column === 'ZMODEL'" @click.stop class="excel-dropdown-panel text-gray-800">
                  <div class="font-bold border-b pb-1 mb-1 text-gray-500 text-[9px] uppercase tracking-wider">Excel Filter: Model</div>
                  <button @click="setColumnSort('contract', 'ZMODEL', 'asc')" class="excel-sort-btn">🔼 Sort Ascending</button>
                  <button @click="setColumnSort('contract', 'ZMODEL', 'desc')" class="excel-sort-btn border-b mb-1 pb-1">🔽 Sort Descending</button>
                  <input v-model="contractColumnFilters.ZMODEL.search" type="text" placeholder="Cari..." class="excel-search-input" />
                  <div class="excel-checklist-container">
                    <label v-for="val in getFilteredUniqueValues('contract', 'ZMODEL')" :key="val" class="excel-checkbox-label group flex items-center justify-between hover:bg-slate-50 px-1 rounded">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <input type="checkbox" :checked="!isValueHidden('contract', 'ZMODEL', val)" @change="toggleValueHidden('contract', 'ZMODEL', val)" class="w-3 h-3 text-blue-600 rounded shrink-0 cursor-pointer" />
                        <span class="truncate">{{ val || '(Blank)' }}</span>
                      </div>
                      <button @click.stop="selectOnlyThisValue('contract', 'ZMODEL', val)" title="Hanya pilih item ini" class="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-semibold shrink-0 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">Only</button>
                    </label>
                  </div>
                  <div class="excel-actions-footer">
                    <button @click="selectAllValues('contract', 'ZMODEL')" class="text-blue-600 hover:underline">Select All</button>
                    <button @click="invertValues('contract', 'ZMODEL')" class="text-blue-600 hover:underline">Invert</button>
                    <button @click="clearAllValues('contract', 'ZMODEL')" class="text-rose-600 hover:underline">Clear</button>
                  </div>
                </div>
              </th>
              <th colspan="6" class="bg-slate-700 text-white py-1">{{ prevMonthLabel }}</th>
              <th colspan="6" class="bg-slate-700 text-white py-1">{{ currMonthLabel }}</th>
              <th colspan="4" class="bg-slate-900 text-white py-1">Difference</th>
              <th v-if="isCurrentMonthSelected" rowspan="2" class="bg-slate-800 text-center text-white py-1 w-[7%]">Status Unit</th>
            </tr>
            <tr class="bg-slate-700 text-white font-medium text-center text-[10px]">
              <th class="bg-slate-600 text-center py-1">Unit/Month</th>
              <th class="bg-slate-600 text-center py-1">Unit/Day</th>
              <th class="bg-slate-600 py-1">Workday</th>
              <th class="bg-slate-600 py-1">Keterangan</th>
              <th class="bg-slate-600 text-center py-1">MDFO</th>
              <th class="bg-slate-600 text-center py-1">Sales Order</th>
              <th class="bg-slate-600 text-center py-1">Unit/Month</th>
              <th class="bg-slate-600 text-center py-1">Unit/Day</th>
              <th class="bg-slate-600 py-1">Workday</th>
              <th class="bg-slate-600 py-1">Keterangan</th>
              <th class="bg-slate-600 text-center py-1">MDFO</th>
              <th class="bg-slate-600 text-center py-1">Sales Order</th>
              <th class="bg-slate-800 text-center py-1">Diff U/M</th>
              <th class="bg-slate-800 text-center py-1">Diff U/D</th>
              <th class="bg-slate-800 py-1">% Unit/Month</th>
              <th class="bg-slate-800 py-1">% Unit/Day</th>
            </tr>
          </thead>
          <tbody class="bg-white">
            <tr v-for="(item, index) in tableRows" :key="index" :class="[
                item.isSubtotal ? 'bg-slate-100 font-bold text-gray-900' : '',
                item.isGrandTotal ? 'bg-slate-200 font-extrabold text-blue-950' : '',
                (!item.isSubtotal && !item.isGrandTotal) ? 'row-hoverable transition-colors' : ''
              ]">
              <td v-if="item.showZcust" :colspan="item.isSubtotal || item.isGrandTotal ? 2 : 1" :rowspan="item.isGrandTotal ? 1 : item.zcustSpan" :class="[
                  item.isSubtotal ? 'text-left pl-2 text-blue-900 bg-blue-50/40' : '',
                  item.isGrandTotal ? 'text-left pl-2 text-blue-950 bg-slate-200' : '',
                  (!item.isSubtotal && !item.isGrandTotal) ? 'font-medium text-gray-900 bg-white' : ''
                ]" class="text-center whitespace-nowrap align-middle cell-padding">
                {{ item.ZCUST || '-' }}
              </td>
              <td v-if="!item.isSubtotal && !item.isGrandTotal" class="text-center text-blue-600 cursor-pointer hover:underline whitespace-nowrap cell-padding" @click="openModelDetails(item)">
                {{ item.ZMODEL || '-' }}
              </td>
              <td class="text-right whitespace-nowrap cell-padding" :class="{ 'diff-highlight': isPrevDiff(item) }">{{ formatNumber(item.UMONTH) }}</td>
              <td class="text-right text-gray-600 whitespace-nowrap cell-padding">{{ formatDecimal(item.UDAY) }}</td>
              <td v-if="item.showZcust" :rowspan="item.isGrandTotal ? 1 : item.zcustSpan" class="text-center text-gray-600 whitespace-nowrap align-middle bg-white cell-padding">
                {{ item.isSubtotal || item.isGrandTotal ? '-' : formatWorkingDay(item.WDAY) }}
              </td>
              <td class="text-center whitespace-nowrap text-gray-800 bg-white cell-padding">
                {{ item.isSubtotal || item.isGrandTotal ? '-' : getKeteranganPrev(item) }}
              </td>
              <td class="text-right whitespace-nowrap cell-padding" :class="{ 'diff-highlight': isPrevDiff(item) && !isPrevMonthPast(item) }">{{ formatNumber(item.MDFO) }}</td>
              <td class="text-right whitespace-nowrap cell-padding" :class="{ 'diff-highlight': isPrevDiff(item) && isPrevMonthPast(item) }">{{ formatNumber(item.SO) }}</td>
              <td class="text-right whitespace-nowrap text-gray-900 font-semibold cell-padding" :class="{ 'diff-highlight': isCurrDiff(item) }">{{ formatNumber(item.UMONTH1) }}</td>
              <td class="text-right text-gray-600 whitespace-nowrap cell-padding">{{ formatDecimal(item.UDAY1) }}</td>
              <td v-if="item.showZcust" :rowspan="item.isGrandTotal ? 1 : item.zcustSpan" class="text-center text-gray-600 whitespace-nowrap align-middle bg-white cell-padding">
                {{ item.isSubtotal || item.isGrandTotal ? '-' : formatWorkingDay(item.WDAY1) }}
              </td>
              <td class="text-center whitespace-nowrap text-gray-800 bg-white cell-padding">
                {{ item.isSubtotal || item.isGrandTotal ? '-' : getKeteranganCurr(item) }}
              </td>
              <td class="text-right whitespace-nowrap cell-padding" :class="{ 'diff-highlight': isCurrDiff(item) && !isCurrMonthPast(item) }">{{ formatNumber(item.MDFO1) }}</td>
              <td class="text-right whitespace-nowrap cell-padding" :class="{ 'diff-highlight': isCurrDiff(item) && isCurrMonthPast(item) }">{{ formatNumber(item.SO1) }}</td>
              <td class="text-right font-bold whitespace-nowrap cell-padding" :class="Number(item.DIFF_UMONTH) > 0 ? 'text-emerald-600' : Number(item.DIFF_UMONTH) < 0 ? 'text-rose-600' : 'text-gray-500'">
                {{ Number(item.DIFF_UMONTH) > 0 ? '+' : '' }}{{ formatNumber(item.DIFF_UMONTH) }}
              </td>
              <td class="text-right font-bold whitespace-nowrap cell-padding" :class="Number(item.DIFF_UDAY) > 0 ? 'text-emerald-600' : Number(item.DIFF_UDAY) < 0 ? 'text-rose-600' : 'text-gray-500'">
                {{ Number(item.DIFF_UDAY) > 0 ? '+' : '' }}{{ formatDecimal(item.DIFF_UDAY) }}
              </td>
              <td class="text-center font-bold whitespace-nowrap cell-padding" :class="getPercentTrend(item.PRS_UMONTH).textClass">
                <span class="inline-flex items-center justify-center gap-0.5"><span>{{ getPercentTrend(item.PRS_UMONTH).arrow }}</span><span>{{ formatPercent(item.PRS_UMONTH) }}</span></span>
              </td>
              <td class="text-center font-bold whitespace-nowrap cell-padding" :class="getPercentTrend(item.PRS_UDAY).textClass">
                <span class="inline-flex items-center justify-center gap-0.5"><span>{{ getPercentTrend(item.PRS_UDAY).arrow }}</span><span>{{ formatPercent(item.PRS_UDAY) }}</span></span>
              </td>
              <td v-if="isCurrentMonthSelected && !item.isSubtotal && !item.isGrandTotal && !isCommonRow(item)" class="text-center cell-padding bg-white" style="width: 75px;">
                <select 
                  v-if="permissions?.create"
                  v-model="item.unit_status"
                  @change="updateUnitStatus(item, item.unit_status)"
                  class="border rounded text-gray-700 bg-white border-slate-300 focus:outline-none focus:border-slate-500 cursor-pointer"
                  style="min-width: 65px; height: 18px; line-height: 1; font-size: 9px; padding: 0px 2px;"
                >
                  <option value="Quotation">Quotation</option>
                  <option value="Contract">Contract</option>
                  <option value="Contract Rev 01">Contract Rev 01</option>
                  <option value="Sales Order">Sales Order</option>
                </select>
                <span v-else class="text-[9px] font-medium text-gray-700">
                  {{ item.unit_status || 'Contract' }}
                </span>
              </td>
              <td v-else-if="isCurrentMonthSelected" class="text-center cell-padding" :class="item.isSubtotal ? 'bg-slate-100' : 'bg-slate-200'">-</td>
            </tr>
          </tbody>
        </table>

        <!-- Weekly Contract Table -->
        <table v-else-if="currentMode === 'contract' && contractCycle === 'weekly'" class="w-full text-xs text-gray-700 font-medium custom-table table-auto-layout weekly-table-detail">
          <thead>
            <tr class="bg-slate-800 text-white font-semibold text-center text-[11px]">
              <th rowspan="3" class="bg-slate-800 text-center relative text-white py-1 w-[8%]">
                <div class="flex justify-center items-center gap-1 px-1">
                  <span>Customer</span>
                  <button @click.stop="toggleHeaderFilter('contract', 'ZCUST')" class="text-slate-400 hover:text-white focus:outline-none">▼</button>
                </div>
                <div v-if="activeFilterDropdown?.mode === 'contract' && activeFilterDropdown?.column === 'ZCUST'" @click.stop class="excel-dropdown-panel text-gray-800">
                  <div class="font-bold border-b pb-1 mb-1 text-gray-500 text-[9px] uppercase tracking-wider">Excel Filter: Cust</div>
                  <button @click="setColumnSort('contract', 'ZCUST', 'asc')" class="excel-sort-btn">🔼 Sort Ascending</button>
                  <button @click="setColumnSort('contract', 'ZCUST', 'desc')" class="excel-sort-btn border-b mb-1 pb-1">🔽 Sort Descending</button>
                  <input v-model="contractColumnFilters.ZCUST.search" type="text" placeholder="Cari..." class="excel-search-input" />
                  <div class="excel-checklist-container">
                    <label v-for="val in getFilteredUniqueValues('contract', 'ZCUST')" :key="val" class="excel-checkbox-label group flex items-center justify-between hover:bg-slate-50 px-1 rounded">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <input type="checkbox" :checked="!isValueHidden('contract', 'ZCUST', val)" @change="toggleValueHidden('contract', 'ZCUST', val)" class="w-3 h-3 text-blue-600 rounded shrink-0 cursor-pointer" />
                        <span class="truncate">{{ val || '(Blank)' }}</span>
                      </div>
                      <button @click.stop="selectOnlyThisValue('contract', 'ZCUST', val)" title="Hanya pilih item ini" class="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-semibold shrink-0 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">Only</button>
                    </label>
                  </div>
                  <div class="excel-actions-footer">
                    <button @click="selectAllValues('contract', 'ZCUST')" class="text-blue-600 hover:underline">Select All</button>
                    <button @click="invertValues('contract', 'ZCUST')" class="text-blue-600 hover:underline">Invert</button>
                    <button @click="clearAllValues('contract', 'ZCUST')" class="text-rose-600 hover:underline">Clear</button>
                  </div>
                </div>
              </th>
              <th rowspan="3" class="bg-slate-800 text-center relative text-white py-1 w-[10%]">
                <div class="flex justify-center items-center gap-1 px-1">
                  <span>Model</span>
                  <button @click.stop="toggleHeaderFilter('contract', 'ZMODEL')" class="text-slate-400 hover:text-white focus:outline-none">▼</button>
                </div>
                <div v-if="activeFilterDropdown?.mode === 'contract' && activeFilterDropdown?.column === 'ZMODEL'" @click.stop class="excel-dropdown-panel text-gray-800">
                  <div class="font-bold border-b pb-1 mb-1 text-gray-500 text-[9px] uppercase tracking-wider">Excel Filter: Model</div>
                  <button @click="setColumnSort('contract', 'ZMODEL', 'asc')" class="excel-sort-btn">🔼 Sort Ascending</button>
                  <button @click="setColumnSort('contract', 'ZMODEL', 'desc')" class="excel-sort-btn border-b mb-1 pb-1">🔽 Sort Descending</button>
                  <input v-model="contractColumnFilters.ZMODEL.search" type="text" placeholder="Cari..." class="excel-search-input" />
                  <div class="excel-checklist-container">
                    <label v-for="val in getFilteredUniqueValues('contract', 'ZMODEL')" :key="val" class="excel-checkbox-label group flex items-center justify-between hover:bg-slate-50 px-1 rounded">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <input type="checkbox" :checked="!isValueHidden('contract', 'ZMODEL', val)" @change="toggleValueHidden('contract', 'ZMODEL', val)" class="w-3 h-3 text-blue-600 rounded shrink-0 cursor-pointer" />
                        <span class="truncate">{{ val || '(Blank)' }}</span>
                      </div>
                      <button @click.stop="selectOnlyThisValue('contract', 'ZMODEL', val)" title="Hanya pilih item ini" class="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-semibold shrink-0 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">Only</button>
                    </label>
                  </div>
                  <div class="excel-actions-footer">
                    <button @click="selectAllValues('contract', 'ZMODEL')" class="text-blue-600 hover:underline">Select All</button>
                    <button @click="invertValues('contract', 'ZMODEL')" class="text-blue-600 hover:underline">Invert</button>
                    <button @click="clearAllValues('contract', 'ZMODEL')" class="text-rose-600 hover:underline">Clear</button>
                  </div>
                </div>
              </th>
              <th :colspan="prevColspan" class="bg-slate-700 text-white py-1">{{ prevMonthLabel }}</th>
              <th :colspan="currColspan" class="bg-slate-700 text-white py-1">{{ currMonthLabel }}</th>
            </tr>
            <tr class="bg-slate-700 text-white font-medium text-center text-[10px]">
              <th colspan="3" :title="getWeekTooltip(prevPeriodString, 'w1')" :class="getWeekHeaderClass(prevPeriodString, 'w1')">W1</th>
              <th colspan="3" :title="getWeekTooltip(prevPeriodString, 'w2')" :class="getWeekHeaderClass(prevPeriodString, 'w2')">W2</th>
              <th colspan="3" :title="getWeekTooltip(prevPeriodString, 'w3')" :class="getWeekHeaderClass(prevPeriodString, 'w3')">W3</th>
              <th colspan="3" :title="getWeekTooltip(prevPeriodString, 'w4')" :class="getWeekHeaderClass(prevPeriodString, 'w4')">W4</th>
              <th v-if="showW5Prev" colspan="3" :title="getWeekTooltip(prevPeriodString, 'w5')" :class="getWeekHeaderClass(prevPeriodString, 'w5')">W5</th>
              <th v-if="showW6Prev" colspan="3" :title="getWeekTooltip(prevPeriodString, 'w6')" :class="getWeekHeaderClass(prevPeriodString, 'w6')">W6</th>
              <th colspan="3" class="bg-slate-600 text-center py-1 text-white font-semibold">Total</th>
              <th colspan="3" :title="getWeekTooltip(formattedPeriod, 'w1')" :class="getWeekHeaderClass(formattedPeriod, 'w1')">W1</th>
              <th colspan="3" :title="getWeekTooltip(formattedPeriod, 'w2')" :class="getWeekHeaderClass(formattedPeriod, 'w2')">W2</th>
              <th colspan="3" :title="getWeekTooltip(formattedPeriod, 'w3')" :class="getWeekHeaderClass(formattedPeriod, 'w3')">W3</th>
              <th colspan="3" :title="getWeekTooltip(formattedPeriod, 'w4')" :class="getWeekHeaderClass(formattedPeriod, 'w4')">W4</th>
              <th v-if="showW5Curr" colspan="3" :title="getWeekTooltip(formattedPeriod, 'w5')" :class="getWeekHeaderClass(formattedPeriod, 'w5')">W5</th>
              <th v-if="showW6Curr" colspan="3" :title="getWeekTooltip(formattedPeriod, 'w6')" :class="getWeekHeaderClass(formattedPeriod, 'w6')">W6</th>
              <th colspan="3" class="bg-slate-600 text-center py-1 text-white font-semibold">Total</th>
            </tr>
            <tr class="bg-slate-600 text-white font-medium text-center text-[10px]">
              <th class="py-1">P</th>
              <th class="py-1">A</th>
              <th class="py-1 border-r border-slate-500">%</th>
              <th class="py-1">P</th>
              <th class="py-1">A</th>
              <th class="py-1 border-r border-slate-500">%</th>
              <th class="py-1">P</th>
              <th class="py-1">A</th>
              <th class="py-1 border-r border-slate-500">%</th>
              <th class="py-1">P</th>
              <th class="py-1">A</th>
              <th class="py-1 border-r border-slate-500">%</th>
              <th v-if="showW5Prev" class="py-1">P</th>
              <th v-if="showW5Prev" class="py-1">A</th>
              <th v-if="showW5Prev" class="py-1 border-r border-slate-500">%</th>
              <th v-if="showW6Prev" class="py-1">P</th>
              <th v-if="showW6Prev" class="py-1">A</th>
              <th v-if="showW6Prev" class="py-1 border-r border-slate-500">%</th>
              <th class="py-1 bg-slate-700">P</th>
              <th class="py-1 bg-slate-700">A</th>
              <th class="py-1 border-r border-slate-500 bg-slate-700">%</th>
              <th class="py-1">P</th>
              <th class="py-1">A</th>
              <th class="py-1 border-r border-slate-500">%</th>
              <th class="py-1">P</th>
              <th class="py-1">A</th>
              <th class="py-1 border-r border-slate-500">%</th>
              <th class="py-1">P</th>
              <th class="py-1">A</th>
              <th class="py-1 border-r border-slate-500">%</th>
              <th class="py-1">P</th>
              <th class="py-1">A</th>
              <th class="py-1 border-r border-slate-500">%</th>
              <th v-if="showW5Curr" class="py-1">P</th>
              <th v-if="showW5Curr" class="py-1">A</th>
              <th v-if="showW5Curr" class="py-1 border-r border-slate-500">%</th>
              <th v-if="showW6Curr" class="py-1">P</th>
              <th v-if="showW6Curr" class="py-1">A</th>
              <th v-if="showW6Curr" class="py-1 border-r border-slate-500">%</th>
              <th class="py-1 bg-slate-700">P</th>
              <th class="py-1 bg-slate-700">A</th>
              <th class="py-1 border-r border-slate-500 bg-slate-700">%</th>
            </tr>
          </thead>
          <tbody class="bg-white">
            <tr v-for="(item, idx) in weeklyTableRows" :key="idx" :class="[
                item.isSubtotal ? 'bg-slate-100 font-bold text-gray-900' : '',
                item.isGrandTotal ? 'bg-slate-200 font-extrabold text-blue-950' : '',
                (!item.isSubtotal && !item.isGrandTotal) ? 'row-hoverable transition-colors' : ''
              ]">
              <td v-if="item.showZcust" :colspan="item.isSubtotal || item.isGrandTotal ? 2 : 1" :rowspan="item.isGrandTotal ? 1 : item.zcustSpan" :class="[
                  item.isSubtotal ? 'text-left pl-3 text-blue-900 bg-blue-50/40 font-bold' : '',
                  item.isGrandTotal ? 'text-left pl-3 text-blue-950 bg-slate-200 font-extrabold' : '',
                  (!item.isSubtotal && !item.isGrandTotal) ? 'font-medium text-gray-900 bg-white text-center' : ''
                ]" class="whitespace-nowrap align-middle cell-padding text-center">
                {{ item.customer || '-' }}
              </td>
              <td v-if="!item.isSubtotal && !item.isGrandTotal" class="text-center text-blue-600 cursor-pointer hover:underline whitespace-nowrap cell-padding" @click="openModelDetails(item)">
                {{ item.model || '-' }}
              </td>

              <!-- Previous Month Weeks -->
              <td :class="getWeekHighlightClass(item, 'prev', 'w1_mdfo')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.prev?.w1_mdfo) }}</td>
              <td :class="getWeekHighlightClass(item, 'prev', 'w1_so')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.prev?.w1_so) }}</td>
              <td :class="getSoVsMdfoColorClass(item.prev?.w1_mdfo, item.prev?.w1_so)" class="text-center whitespace-nowrap cell-padding text-[10px] font-semibold">{{ getSoVsMdfoPercent(item.prev?.w1_mdfo, item.prev?.w1_so) }}</td>

              <td :class="getWeekHighlightClass(item, 'prev', 'w2_mdfo')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.prev?.w2_mdfo) }}</td>
              <td :class="getWeekHighlightClass(item, 'prev', 'w2_so')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.prev?.w2_so) }}</td>
              <td :class="getSoVsMdfoColorClass(item.prev?.w2_mdfo, item.prev?.w2_so)" class="text-center whitespace-nowrap cell-padding text-[10px] font-semibold">{{ getSoVsMdfoPercent(item.prev?.w2_mdfo, item.prev?.w2_so) }}</td>

              <td :class="getWeekHighlightClass(item, 'prev', 'w3_mdfo')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.prev?.w3_mdfo) }}</td>
              <td :class="getWeekHighlightClass(item, 'prev', 'w3_so')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.prev?.w3_so) }}</td>
              <td :class="getSoVsMdfoColorClass(item.prev?.w3_mdfo, item.prev?.w3_so)" class="text-center whitespace-nowrap cell-padding text-[10px] font-semibold">{{ getSoVsMdfoPercent(item.prev?.w3_mdfo, item.prev?.w3_so) }}</td>

              <td :class="getWeekHighlightClass(item, 'prev', 'w4_mdfo')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.prev?.w4_mdfo) }}</td>
              <td :class="getWeekHighlightClass(item, 'prev', 'w4_so')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.prev?.w4_so) }}</td>
              <td :class="getSoVsMdfoColorClass(item.prev?.w4_mdfo, item.prev?.w4_so)" class="text-center whitespace-nowrap cell-padding text-[10px] font-semibold">{{ getSoVsMdfoPercent(item.prev?.w4_mdfo, item.prev?.w4_so) }}</td>

              <template v-if="showW5Prev">
                <td :class="getWeekHighlightClass(item, 'prev', 'w5_mdfo')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.prev?.w5_mdfo) }}</td>
                <td :class="getWeekHighlightClass(item, 'prev', 'w5_so')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.prev?.w5_so) }}</td>
                <td :class="getSoVsMdfoColorClass(item.prev?.w5_mdfo, item.prev?.w5_so)" class="text-center whitespace-nowrap cell-padding text-[10px] font-semibold">{{ getSoVsMdfoPercent(item.prev?.w5_mdfo, item.prev?.w5_so) }}</td>
              </template>
              <template v-if="showW6Prev">
                <td :class="getWeekHighlightClass(item, 'prev', 'w6_mdfo')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.prev?.w6_mdfo) }}</td>
                <td :class="getWeekHighlightClass(item, 'prev', 'w6_so')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.prev?.w6_so) }}</td>
                <td :class="getSoVsMdfoColorClass(item.prev?.w6_mdfo, item.prev?.w6_so)" class="text-center whitespace-nowrap cell-padding text-[10px] font-semibold">{{ getSoVsMdfoPercent(item.prev?.w6_mdfo, item.prev?.w6_so) }}</td>
              </template>

              <!-- Previous Month Total -->
              <td class="text-right whitespace-nowrap cell-padding font-semibold bg-slate-50/50">{{ formatNumber(getWeeklyRowPrevTotalMdfo(item)) }}</td>
              <td class="text-right whitespace-nowrap cell-padding font-semibold bg-slate-50/50">{{ formatNumber(getWeeklyRowPrevTotalSo(item)) }}</td>
              <td :class="getSoVsMdfoColorClass(getWeeklyRowPrevTotalMdfo(item), getWeeklyRowPrevTotalSo(item))" class="text-center whitespace-nowrap cell-padding font-semibold bg-slate-50/50 text-[10px]">{{ getSoVsMdfoPercent(getWeeklyRowPrevTotalMdfo(item), getWeeklyRowPrevTotalSo(item)) }}</td>

              <!-- Current Month Weeks -->
              <td :class="getWeekHighlightClass(item, 'curr', 'w1_mdfo')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.curr?.w1_mdfo) }}</td>
              <td :class="getWeekHighlightClass(item, 'curr', 'w1_so')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.curr?.w1_so) }}</td>
              <td :class="getSoVsMdfoColorClass(item.curr?.w1_mdfo, item.curr?.w1_so)" class="text-center whitespace-nowrap cell-padding text-[10px] font-semibold">{{ getSoVsMdfoPercent(item.curr?.w1_mdfo, item.curr?.w1_so) }}</td>

              <td :class="getWeekHighlightClass(item, 'curr', 'w2_mdfo')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.curr?.w2_mdfo) }}</td>
              <td :class="getWeekHighlightClass(item, 'curr', 'w2_so')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.curr?.w2_so) }}</td>
              <td :class="getSoVsMdfoColorClass(item.curr?.w2_mdfo, item.curr?.w2_so)" class="text-center whitespace-nowrap cell-padding text-[10px] font-semibold">{{ getSoVsMdfoPercent(item.curr?.w2_mdfo, item.curr?.w2_so) }}</td>

              <td :class="getWeekHighlightClass(item, 'curr', 'w3_mdfo')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.curr?.w3_mdfo) }}</td>
              <td :class="getWeekHighlightClass(item, 'curr', 'w3_so')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.curr?.w3_so) }}</td>
              <td :class="getSoVsMdfoColorClass(item.curr?.w3_mdfo, item.curr?.w3_so)" class="text-center whitespace-nowrap cell-padding text-[10px] font-semibold">{{ getSoVsMdfoPercent(item.curr?.w3_mdfo, item.curr?.w3_so) }}</td>

              <td :class="getWeekHighlightClass(item, 'curr', 'w4_mdfo')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.curr?.w4_mdfo) }}</td>
              <td :class="getWeekHighlightClass(item, 'curr', 'w4_so')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.curr?.w4_so) }}</td>
              <td :class="getSoVsMdfoColorClass(item.curr?.w4_mdfo, item.curr?.w4_so)" class="text-center whitespace-nowrap cell-padding text-[10px] font-semibold">{{ getSoVsMdfoPercent(item.curr?.w4_mdfo, item.curr?.w4_so) }}</td>

              <template v-if="showW5Curr">
                <td :class="getWeekHighlightClass(item, 'curr', 'w5_mdfo')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.curr?.w5_mdfo) }}</td>
                <td :class="getWeekHighlightClass(item, 'curr', 'w5_so')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.curr?.w5_so) }}</td>
                <td :class="getSoVsMdfoColorClass(item.curr?.w5_mdfo, item.curr?.w5_so)" class="text-center whitespace-nowrap cell-padding text-[10px] font-semibold">{{ getSoVsMdfoPercent(item.curr?.w5_mdfo, item.curr?.w5_so) }}</td>
              </template>
              <template v-if="showW6Curr">
                <td :class="getWeekHighlightClass(item, 'curr', 'w6_mdfo')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.curr?.w6_mdfo) }}</td>
                <td :class="getWeekHighlightClass(item, 'curr', 'w6_so')" class="text-right whitespace-nowrap cell-padding">{{ formatNumber(item.curr?.w6_so) }}</td>
                <td :class="getSoVsMdfoColorClass(item.curr?.w6_mdfo, item.curr?.w6_so)" class="text-center whitespace-nowrap cell-padding text-[10px] font-semibold">{{ getSoVsMdfoPercent(item.curr?.w6_mdfo, item.curr?.w6_so) }}</td>
              </template>

              <!-- Current Month Total -->
              <td class="text-right whitespace-nowrap cell-padding font-semibold bg-slate-50/50">{{ formatNumber(getWeeklyRowCurrTotalMdfo(item)) }}</td>
              <td class="text-right whitespace-nowrap cell-padding font-semibold bg-slate-50/50">{{ formatNumber(getWeeklyRowCurrTotalSo(item)) }}</td>
              <td :class="getSoVsMdfoColorClass(getWeeklyRowCurrTotalMdfo(item), getWeeklyRowCurrTotalSo(item))" class="text-center whitespace-nowrap cell-padding font-semibold bg-slate-50/50 text-[10px]">{{ getSoVsMdfoPercent(getWeeklyRowCurrTotalMdfo(item), getWeeklyRowCurrTotalSo(item)) }}</td>
            </tr>
          </tbody>
        </table>

        <table v-else-if="currentMode === 'quotation'" class="w-full text-xs text-gray-700 font-medium custom-table table-auto-layout quot-table">
          <thead>
            <tr class="bg-slate-800 text-white font-semibold text-center text-[12px]">
              <th class="bg-slate-800 text-center text-white py-2 w-[4%]">No</th>
              <th class="relative text-center bg-slate-800 text-white py-2 w-[8%]">
                <div class="flex justify-center items-center gap-1 px-1">
                  <span>Customer</span>
                  <button @click.stop="toggleHeaderFilter('quotation', 'customer')" class="text-slate-400 hover:text-white">▼</button>
                </div>
                <div v-if="activeFilterDropdown?.mode === 'quotation' && activeFilterDropdown?.column === 'customer'" @click.stop class="excel-dropdown-panel text-gray-800">
                  <button @click="setColumnSort('quotation', 'customer', 'asc')" class="excel-sort-btn">🔼 Sort Ascending</button>
                  <button @click="setColumnSort('quotation', 'customer', 'desc')" class="excel-sort-btn border-b mb-1 pb-1">🔽 Sort Descending</button>
                  <input v-model="quotationColumnFilters.customer.search" type="text" placeholder="Cari..." class="excel-search-input" />
                  <div class="excel-checklist-container">
                    <label v-for="val in getFilteredUniqueValues('quotation', 'customer')" :key="val" class="excel-checkbox-label group flex items-center justify-between hover:bg-slate-50 px-1 rounded">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <input type="checkbox" :checked="!isValueHidden('quotation', 'customer', val)" @change="toggleValueHidden('quotation', 'customer', val)" class="w-3 h-3 text-blue-600 rounded shrink-0 cursor-pointer" />
                        <span class="truncate">{{ val || '(Blank)' }}</span>
                      </div>
                      <button @click.stop="selectOnlyThisValue('quotation', 'customer', val)" title="Hanya pilih item ini" class="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-semibold shrink-0 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">Only</button>
                    </label>
                  </div>
                  <div class="excel-actions-footer">
                    <button @click="selectAllValues('quotation', 'customer')" class="text-blue-600 hover:underline">Select All</button>
                    <button @click="invertValues('quotation', 'customer')" class="text-blue-600 hover:underline">Invert</button>
                    <button @click="clearAllValues('quotation', 'customer')" class="text-rose-600 hover:underline">Clear</button>
                  </div>
                </div>
              </th>

              <th class="relative text-center bg-slate-800 text-white py-2">
                <div class="flex justify-center items-center gap-1 px-1">
                  <span>Part Number</span>
                  <button @click.stop="toggleHeaderFilter('quotation', 'MATNR')" class="text-slate-400 hover:text-white">▼</button>
                </div>
                <div v-if="activeFilterDropdown?.mode === 'quotation' && activeFilterDropdown?.column === 'MATNR'" @click.stop class="excel-dropdown-panel text-gray-800">
                  <button @click="setColumnSort('quotation', 'MATNR', 'asc')" class="excel-sort-btn">🔼 Sort Ascending</button>
                  <button @click="setColumnSort('quotation', 'MATNR', 'desc')" class="excel-sort-btn border-b mb-1 pb-1">🔽 Sort Descending</button>
                  <input v-model="quotationColumnFilters.MATNR.search" type="text" placeholder="Cari..." class="excel-search-input" />
                  <div class="excel-checklist-container">
                    <label v-for="val in getFilteredUniqueValues('quotation', 'MATNR')" :key="val" class="excel-checkbox-label group flex items-center justify-between hover:bg-slate-50 px-1 rounded">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <input type="checkbox" :checked="!isValueHidden('quotation', 'MATNR', val)" @change="toggleValueHidden('quotation', 'MATNR', val)" class="w-3 h-3 text-blue-600 rounded shrink-0 cursor-pointer" />
                        <span class="truncate">{{ val || '(Blank)' }}</span>
                      </div>
                      <button @click.stop="selectOnlyThisValue('quotation', 'MATNR', val)" title="Hanya pilih item ini" class="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-semibold shrink-0 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">Only</button>
                    </label>
                  </div>
                  <div class="excel-actions-footer">
                    <button @click="selectAllValues('quotation', 'MATNR')" class="text-blue-600 hover:underline">Select All</button>
                    <button @click="invertValues('quotation', 'MATNR')" class="text-blue-600 hover:underline">Invert</button>
                    <button @click="clearAllValues('quotation', 'MATNR')" class="text-rose-600 hover:underline">Clear</button>
                  </div>
                </div>
              </th>

              <th class="relative text-center bg-slate-800 text-white py-2">
                <div class="flex justify-center items-center gap-1 px-1">
                  <span>Job Number</span>
                  <button @click.stop="toggleHeaderFilter('quotation', 'job_number')" class="text-slate-400 hover:text-white">▼</button>
                </div>
                <div v-if="activeFilterDropdown?.mode === 'quotation' && activeFilterDropdown?.column === 'job_number'" @click.stop class="excel-dropdown-panel text-gray-800">
                  <button @click="setColumnSort('quotation', 'job_number', 'asc')" class="excel-sort-btn">🔼 Sort Ascending</button>
                  <button @click="setColumnSort('quotation', 'job_number', 'desc')" class="excel-sort-btn border-b mb-1 pb-1">🔽 Sort Descending</button>
                  <input v-model="quotationColumnFilters.job_number.search" type="text" placeholder="Cari..." class="excel-search-input" />
                  <div class="excel-checklist-container">
                    <label v-for="val in getFilteredUniqueValues('quotation', 'job_number')" :key="val" class="excel-checkbox-label group flex items-center justify-between hover:bg-slate-50 px-1 rounded">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <input type="checkbox" :checked="!isValueHidden('quotation', 'job_number', val)" @change="toggleValueHidden('quotation', 'job_number', val)" class="w-3 h-3 text-blue-600 rounded shrink-0 cursor-pointer" />
                        <span class="truncate">{{ val || '(Blank)' }}</span>
                      </div>
                      <button @click.stop="selectOnlyThisValue('quotation', 'job_number', val)" title="Hanya pilih item ini" class="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-semibold shrink-0 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">Only</button>
                    </label>
                  </div>
                  <div class="excel-actions-footer">
                    <button @click="selectAllValues('quotation', 'job_number')" class="text-blue-600 hover:underline">Select All</button>
                    <button @click="invertValues('quotation', 'job_number')" class="text-blue-600 hover:underline">Invert</button>
                    <button @click="clearAllValues('quotation', 'job_number')" class="text-rose-600 hover:underline">Clear</button>
                  </div>
                </div>
              </th>

              <th class="relative text-center bg-slate-800 text-white py-2 w-[10%]">
                <div class="flex justify-center items-center gap-1 px-1">
                  <span>Model</span>
                  <button @click.stop="toggleHeaderFilter('quotation', 'project')" class="text-slate-400 hover:text-white">▼</button>
                </div>
                <div v-if="activeFilterDropdown?.mode === 'quotation' && activeFilterDropdown?.column === 'project'" @click.stop class="excel-dropdown-panel text-gray-800">
                  <button @click="setColumnSort('quotation', 'project', 'asc')" class="excel-sort-btn">🔼 Sort Ascending</button>
                  <button @click="setColumnSort('quotation', 'project', 'desc')" class="excel-sort-btn border-b mb-1 pb-1">🔽 Sort Descending</button>
                  <input v-model="quotationColumnFilters.project.search" type="text" placeholder="Cari..." class="excel-search-input" />
                  <div class="excel-checklist-container">
                    <label v-for="val in getFilteredUniqueValues('quotation', 'project')" :key="val" class="excel-checkbox-label group flex items-center justify-between hover:bg-slate-50 px-1 rounded">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <input type="checkbox" :checked="!isValueHidden('quotation', 'project', val)" @change="toggleValueHidden('quotation', 'project', val)" class="w-3 h-3 text-blue-600 rounded shrink-0 cursor-pointer" />
                        <span class="truncate">{{ val || '(Blank)' }}</span>
                      </div>
                      <button @click.stop="selectOnlyThisValue('quotation', 'project', val)" title="Hanya pilih item ini" class="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-semibold shrink-0 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">Only</button>
                    </label>
                  </div>
                  <div class="excel-actions-footer">
                    <button @click="selectAllValues('quotation', 'project')" class="text-blue-600 hover:underline">Select All</button>
                    <button @click="invertValues('quotation', 'project')" class="text-blue-600 hover:underline">Invert</button>
                    <button @click="clearAllValues('quotation', 'project')" class="text-rose-600 hover:underline">Clear</button>
                  </div>
                </div>
              </th>

              <th class="relative text-center bg-slate-800 text-white py-2">
                <div class="flex justify-center items-center gap-1 px-1">
                  <span>Sub Model</span>
                  <button @click.stop="toggleHeaderFilter('quotation', 'project_detail')" class="text-slate-400 hover:text-white">▼</button>
                </div>
                <div v-if="activeFilterDropdown?.mode === 'quotation' && activeFilterDropdown?.column === 'project_detail'" @click.stop class="excel-dropdown-panel text-gray-800">
                  <button @click="setColumnSort('quotation', 'project_detail', 'asc')" class="excel-sort-btn">🔼 Sort Ascending</button>
                  <button @click="setColumnSort('quotation', 'project_detail', 'desc')" class="excel-sort-btn border-b mb-1 pb-1">🔽 Sort Descending</button>
                  <input v-model="quotationColumnFilters.project_detail.search" type="text" placeholder="Cari..." class="excel-search-input" />
                  <div class="excel-checklist-container">
                    <label v-for="val in getFilteredUniqueValues('quotation', 'project_detail')" :key="val" class="excel-checkbox-label group flex items-center justify-between hover:bg-slate-50 px-1 rounded">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <input type="checkbox" :checked="!isValueHidden('quotation', 'project_detail', val)" @change="toggleValueHidden('quotation', 'project_detail', val)" class="w-3 h-3 text-blue-600 rounded shrink-0 cursor-pointer" />
                        <span class="truncate">{{ val || '(Blank)' }}</span>
                      </div>
                      <button @click.stop="selectOnlyThisValue('quotation', 'project_detail', val)" title="Hanya pilih item ini" class="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-semibold shrink-0 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">Only</button>
                    </label>
                  </div>
                  <div class="excel-actions-footer">
                    <button @click="selectAllValues('quotation', 'project_detail')" class="text-blue-600 hover:underline">Select All</button>
                    <button @click="invertValues('quotation', 'project_detail')" class="text-blue-600 hover:underline">Invert</button>
                    <button @click="clearAllValues('quotation', 'project_detail')" class="text-rose-600 hover:underline">Clear</button>
                  </div>
                </div>
              </th>
              <th class="text-center px-2 whitespace-nowrap bg-slate-700 text-white py-2">{{ quotationMonths[0]?.label }}</th>
              <th class="text-center px-2 whitespace-nowrap bg-slate-700 text-white py-2">{{ quotationMonths[1]?.label }}</th>
              <th class="text-center px-2 whitespace-nowrap bg-slate-900 text-white py-2">{{ quotationMonths[2]?.label }}</th>
            </tr>
          </thead>
          <tbody class="bg-white">
            <tr v-for="(item, index) in paginatedQuotationRows" :key="index" :class="[
                item.isGrandTotal ? 'bg-slate-200 font-extrabold text-blue-950' : 'row-hoverable transition-colors'
              ]">
              <td class="text-center cell-padding whitespace-nowrap font-medium" :class="item.isGrandTotal ? 'bg-slate-200' : 'bg-white text-gray-900'">
                {{ item.isGrandTotal ? '' : (filter.perPage === 'All' ? index + 1 : (currentPage - 1) * Number(filter.perPage) + index + 1) }}
              </td>
              <td :class="item.isGrandTotal ? 'text-left pl-2 text-blue-950 bg-slate-200 font-extrabold' : 'font-medium text-gray-900 text-center'" class="whitespace-nowrap align-middle cell-padding">
                {{ item.customer || '-' }}
              </td>
              <td v-if="!item.isGrandTotal" class="text-center text-blue-600 cursor-pointer hover:underline whitespace-nowrap cell-padding" @click="openModelDetails(item)">
                {{ item.MATNR || '-' }}
              </td>
              <td v-if="!item.isGrandTotal" class="text-center text-gray-800 whitespace-nowrap cell-padding">
                {{ item.job_number || '-' }}
              </td>
              <td v-if="!item.isGrandTotal" class="text-center text-blue-600 cursor-pointer hover:underline whitespace-nowrap cell-padding" @click="openModelDetails(item)">
                {{ item.project || '-' }}
              </td>
              <td v-if="!item.isGrandTotal" class="text-left text-gray-800 truncate max-w-[120px] cell-padding" :title="item.project_detail">
                {{ item.project_detail || '-' }}
              </td>

              <td v-if="item.isGrandTotal" colspan="4" class="bg-slate-200"></td>

              <td class="text-right whitespace-nowrap text-gray-900 font-medium cell-padding" :class="item.isGrandTotal ? 'bg-slate-200 font-extrabold text-blue-950' : ''">{{ formatNumber(item.KWMENG_ZQUOT1) }}</td>
              <td class="text-right whitespace-nowrap text-gray-900 font-medium cell-padding" :class="item.isGrandTotal ? 'bg-slate-200 font-extrabold text-blue-950' : ''">{{ formatNumber(item.KWMENG_ZQUOT2) }}</td>
              <td class="text-right whitespace-nowrap text-blue-950 font-bold bg-blue-50/10 cell-padding" :class="item.isGrandTotal ? 'bg-slate-200 font-extrabold text-blue-950' : ''">{{ formatNumber(item.KWMENG_ZQUOT3) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="currentMode === 'quotation' && filter.perPage !== 'All' && quotationTableRows.length > 0" class="flex justify-between items-center mt-3 px-1 flex-wrap gap-2">
        <span class="text-caption text-grey-darken-1">
          Halaman {{ currentPage }} dari {{ totalQuotationPages }}
          ({{ formatNumber(quotationTableRows.filter(r => !r.isGrandTotal).length) }} data total)
        </span>
        <div class="flex items-center gap-2">
          <v-btn size="small" variant="outlined" :disabled="currentPage === 1" @click="goToPrevPage"><v-icon size="16" class="mr-1">mdi-chevron-left</v-icon> Prev</v-btn>
          <span class="text-caption font-weight-medium px-2">{{ currentPage }} / {{ totalQuotationPages }}</span>
          <v-btn size="small" variant="outlined" :disabled="currentPage === totalQuotationPages" @click="goToNextPage">Next <v-icon size="16" class="ml-1">mdi-chevron-right</v-icon></v-btn>
        </div>
      </div>
    </v-card>
  </div>

  <v-dialog v-model="dialogDetails" max-width="450">
    <v-card class="rounded-xl overflow-hidden shadow-xl">
      <v-card-item class="bg-slate-800 text-white py-3 px-4">
        <div class="flex justify-between items-center w-full">
          <div>
            <div class="text-subtitle-1 font-weight-bold" v-if="currentMode === 'contract' || selectedItem?.ZCUST">Detail Model: {{ selectedItem?.ZMODEL || selectedItem?.model }}</div>
            <div class="text-subtitle-1 font-weight-bold" v-else>Detail Part: {{ selectedItem?.MATNR || selectedItem?.matnr }}</div>
            <div class="text-caption text-slate-300">Customer: {{ selectedItem?.ZCUST || selectedItem?.customer }}</div>
          </div>
          <v-btn icon variant="text" color="white" size="small" @click="dialogDetails = false">X</v-btn>
        </div>
      </v-card-item>
      <v-card-text class="pa-4 bg-slate-50">
        <div v-if="currentMode === 'contract' || selectedItem?.ZCUST">
          <div class="mb-2 text-caption text-grey font-weight-bold uppercase tracking-wider">Part Utama</div>
          <div class="bg-white pa-3 rounded border border-slate-200">
            <div class="flex justify-between mb-1 text-body-2"><span class="text-grey-darken-1">Part Number 1:</span><span class="font-weight-bold text-slate-900">{{ selectedItem?.MATNR || selectedItem?.matnr || '-' }}</span></div>
            <div class="flex justify-between text-body-2"><span class="text-grey-darken-1">Job Number:</span><span class="font-weight-bold text-slate-900">{{ selectedItem?.BISMT || selectedItem?.job_number || '-' }}</span></div>
          </div>
          <div v-if="selectedItem?.MATNR1 || selectedItem?.matnr1" class="mt-3">
            <div class="mb-2 text-caption text-blue font-weight-bold uppercase tracking-wider">Part Number 2</div>
            <div class="bg-blue-50/30 pa-3 rounded border border-blue-100">
              <div class="flex justify-between mb-1 text-body-2"><span class="text-blue-grey-darken-1">Part Number 2:</span><span class="font-weight-bold text-blue-900">{{ selectedItem?.MATNR1 || selectedItem?.matnr1 }}</span></div>
              <div class="flex justify-between text-body-2"><span class="text-blue-grey-darken-1">Job Number 2:</span><span class="font-weight-bold text-blue-900">{{ selectedItem?.BISMT1 || selectedItem?.job_number1 || '-' }}</span></div>
            </div>
          </div>
        </div>
        <div v-else>
          <div class="mb-2 text-caption text-grey font-weight-bold uppercase tracking-wider">Info Quotation</div>
          <div class="bg-white pa-3 rounded border border-slate-200 text-body-2">
            <div class="flex justify-between mb-2"><span class="text-grey-darken-1">Part Number:</span><span class="font-weight-bold text-slate-900">{{ selectedItem?.MATNR || '-' }}</span></div>
            <div class="flex justify-between mb-2"><span class="text-grey-darken-1">Model:</span><span class="font-weight-bold text-slate-900">{{ selectedItem?.project || selectedItem?.ZMODEL || '-' }}</span></div>
            <div class="mb-2"><span class="text-grey-darken-1 block mb-0.5">Description (Sub Model):</span><span class="font-weight-bold text-slate-900 block bg-slate-50 border rounded pa-2 text-xs">{{ selectedItem?.project_detail || selectedItem?.MAKTX || '-' }}</span></div>
            <div class="grid grid-cols-3 gap-2 mt-2">
              <div class="bg-slate-50 rounded pa-2 border">
                <span class="text-[10px] text-gray-500 block truncate">{{ quotationMonths[0]?.label }}:</span>
                <span class="font-weight-bold text-blue-900 text-xs">{{ formatNumber(selectedItem?.KWMENG_ZQUOT1) }}</span>
              </div>
              <div class="bg-slate-50 rounded pa-2 border">
                <span class="text-[10px] text-gray-500 block truncate">{{ quotationMonths[1]?.label }}:</span>
                <span class="font-weight-bold text-blue-900 text-xs">{{ formatNumber(selectedItem?.KWMENG_ZQUOT2) }}</span>
              </div>
              <div class="bg-slate-50 rounded pa-2 border">
                <span class="text-[10px] text-gray-500 block truncate">{{ quotationMonths[2]?.label }}:</span>
                <span class="font-weight-bold text-blue-900 text-xs">{{ formatNumber(selectedItem?.KWMENG_ZQUOT3) }}</span>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 bg-white justify-end">
        <v-btn size="small" variant="flat" class="text-none text-white rounded px-4" style="background-color: #1e293b;" @click="dialogDetails = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Konfirmasi Perubahan Status Unit -->
  <v-dialog v-model="dialogConfirm" max-width="400" persistent>
    <v-card class="rounded-xl overflow-hidden shadow-xl">
      <v-card-item class="bg-amber-600 text-white py-3 px-4">
        <div class="flex items-center gap-2">
          <span class="text-subtitle-1 font-weight-bold">Konfirmasi Perubahan</span>
        </div>
      </v-card-item>
      <v-card-text class="pa-4 text-body-2 text-slate-800">
        Apakah Anda yakin ingin mengubah status unit untuk model <strong>{{ confirmPendingAction?.item?.ZMODEL }}</strong> (Customer: {{ confirmPendingAction?.item?.ZCUST }}) dari <strong>{{ confirmPendingAction?.originalStatus }}</strong> menjadi <strong>{{ confirmPendingAction?.newStatus }}</strong>?
      </v-card-text>
      <v-card-actions class="pa-3 bg-slate-50 justify-end gap-2">
        <v-btn size="small" variant="outlined" class="text-none rounded px-4" @click="cancelUpdateStatus">Batal</v-btn>
        <v-btn size="small" variant="flat" color="primary" class="text-none text-white rounded px-4" @click="confirmUpdateStatus">Yakin</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom right">
    {{ snackbar.text }}
    <template v-slot:actions>
      <v-btn variant="text" @click="snackbar.show = false">Tutup</v-btn>
    </template>
  </v-snackbar>
</template>

<style scoped>
.table-fullview-container {
  width: 100%;
  overflow-x: auto; 
  overflow-y: visible; 
  background-color: #ffffff;
  -webkit-overflow-scrolling: touch;
}

.contract-table-detail {
  min-width: 1600px;
}

.weekly-table-detail {
  min-width: 1800px;
}

.quot-table {
  min-width: 1000px;
}

.quot-summary-table {
  min-width: 600px;
}

.table-auto-layout {
  table-layout: auto !important;
  width: 100%;
  border-collapse: collapse;
}

.custom-table,
.custom-table :deep(tr),
.custom-table :deep(th),
.custom-table :deep(td) {
  border: 1px solid #cbd5e1 !important;
}

.custom-table tbody tr.row-hoverable:hover td {
  background-color: #eff6ff !important;
}

.cell-padding {
  padding: 4px 6px !important;
  font-size: 11px;
}

.excel-dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  padding: 8px;
  z-index: 50;
  width: max-content;
  min-width: 160px;
  max-height: 220px;
  overflow-y: auto;
  text-align: left;
}

.excel-sort-btn {
  display: block;
  width: 100%;
  text-align: left;
  padding: 3px 0;
  font-size: 11px;
  color: #475569;
}
.excel-sort-btn:hover { color: #020617; font-weight: 600; }

.excel-search-input {
  width: 100%;
  border: 1px solid #94a3b8;
  border-radius: 4px;
  padding: 3px 6px;
  margin-bottom: 6px;
  font-size: 11px;
  outline: none;
}
.excel-search-input:focus { border-color: #3b82f6; }

.excel-checklist-container {
  max-height: 100px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 4px;
  margin-bottom: 6px;
}

.excel-checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #334155;
  cursor: pointer;
  padding: 1px 0;
}

.excel-actions-footer {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  font-size: 10px;
  font-weight: 600;
}

.diff-highlight {
  background-color: #fef3c7 !important;
  color: #b45309 !important;
  font-weight: 600 !important;
}

/* Reset global input styles inside Vuetify text fields and selects to prevent double borders */
:deep(.v-text-field input),
:deep(.v-select input),
:deep(.v-autocomplete input) {
  border: none !important;
  background-color: transparent !important;
  box-shadow: none !important;
  outline: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
}
:deep(.v-text-field input:focus),
:deep(.v-select input:focus),
:deep(.v-autocomplete input:focus) {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}

/* Center style for year input text and hide default spin-buttons */
:deep(.text-center-input input) {
  text-align: center !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  -moz-appearance: textfield;
}
:deep(.text-center-input input::-webkit-outer-spin-button),
:deep(.text-center-input input::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}
</style>

<style>
.custom-table,
.custom-table tr,
.custom-table th,
.custom-table td {
  border: 1px solid #cbd5e1 !important;
  border-collapse: collapse !important;
}
</style>