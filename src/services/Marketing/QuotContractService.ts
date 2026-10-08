import axios from 'axios'
import { useConfigStore } from '@/stores/config'

export interface QuotContractResponse {
  data: any[]
  quotationSummary: any[]
  quotationDetail: any[]
}

export async function getSalesMonthlyData(period: string): Promise<any[]> {
  const configStore = useConfigStore()
  const salesUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/Report_delivery/sales_monthly_direct_sap`
  const params = {
    period,
    spmon: period,
    month: period,
    periode: period
  }

  try {
    const res = await axios.get(salesUrl, { params })
    return Array.isArray(res.data) ? res.data : res.data?.data || []
  } catch (err) {
    console.error('Error fetching sales summary data:', err)
    return []
  }
}

export async function getQuotationMonthlyData(period: string): Promise<any[]> {
  const configStore = useConfigStore()
  const quotUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/Report_delivery/quotation_monthly_direct_sap`
  const params = {
    period,
    spmon: period,
    month: period,
    periode: period
  }

  try {
    const quotRes = await axios.get(quotUrl, { params })
    const quotationRaw = quotRes.data || {}
    const quotationDetail: any[] = []

    const addQuotationItems = (arr: any[], monthIndex: number) => {
      if (!Array.isArray(arr)) return
      arr.forEach(item => {
        quotationDetail.push({
          ...item,
          monthIndex
        })
      })
    }

    addQuotationItems(quotationRaw.ZQUOT1 || quotationRaw.zquot1 || [], 1)
    addQuotationItems(quotationRaw.ZQUOT2 || quotationRaw.zquot2 || [], 2)
    addQuotationItems(quotationRaw.ZQUOT3 || quotationRaw.zquot3 || [], 3)

    return quotationDetail
  } catch (err) {
    console.error('Error fetching quotation detail data:', err)
    return []
  }
}

export async function getQuotContractData(period: string): Promise<QuotContractResponse> {
  const [salesData, quotationDetail] = await Promise.all([
    getSalesMonthlyData(period),
    getQuotationMonthlyData(period)
  ])

  return {
    data: salesData,
    quotationSummary: salesData,
    quotationDetail
  }
}

export interface WeeklyUnitResponse {
  status: string
  spmon: string
  week_info: Record<string, Record<string, string>>
  data: any[]
}

export async function getWeeklyUnitData(spmon: string): Promise<WeeklyUnitResponse> {
  const configStore = useConfigStore()
  const url = `http://${configStore.apiUrl}/majsf_rest_api/api/Report_delivery/weekly_unit`
  const res = await axios.get(url, { params: { spmon } })
  return res.data
}