import { defineStore } from 'pinia';
import type { 
  ParamsFilter, 
  ScannedTagRawItem, 
  ScannedItem 
} from '@/types/Logistik/IFP/Report/ScannedSTO';
import { useScannedSTOService } from '@/services/Logistik/IFP/Report/STOService';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import { useUtilityStore } from '@/stores/utility';
export const useScannedSTOStore = defineStore('ScannedSTO', {
  state: () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    return {
      scannedTags: [] as ScannedTagRawItem[],
      scannedTable: [] as ScannedItem[],
      isLoading: false,
      params: { start: todayStr, end: '' } as ParamsFilter,
      dialog: {
        deleteScan: false
      }
    };
  },
  getters: {
    permissions: () => {
      const authStore = useAuthStore();
      
      return {
        view: authStore.checkAccess('Module.View.STOReport'),
        export: authStore.checkAccess('Module.Export.STOReport'),
        manage: authStore.checkAccess('Module.Manage.STO')
      };
    },
    
    formattedDateRange: (state) => {
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      };
      
      return {
        start: formatDate(state.params.start),
        end: formatDate(state.params.end)
      };
    },
    
    totalData: (state) => state.scannedTable.length,
    
    summary: (state) => {
      const totalQty = state.scannedTable.reduce((sum, item) => {
        const qty = parseInt(item.qty) || 0;
        return sum + qty;
      }, 0);
      
      const uniqueParts = new Set(state.scannedTable.map(item => item.part_number)).size;
      const uniqueJobs = new Set(state.scannedTable.map(item => item.job_number)).size;
      
      return {
        totalQty,
        uniqueParts,
        uniqueJobs,
        totalRecords: state.scannedTable.length
      };
    }
  },
  actions: {
    async validateDateRange() {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      
      this.isLoading = true;

      try {
        const { start, end } = this.params;
        
        if (!start) {
          notificationStore.showAlertError('Start Date harus diisi!');
          return false;
        }
        
        if (end && new Date(start) > new Date(end)) {
          notificationStore.showAlertError('Start Date tidak boleh lebih besar dari End Date!');
          return false;
        }
        
        await this.fetchScannedSTOData();
        return true;
        
      } catch (error: any) {
        utilityStore.onError(error);
        return false;
      } finally {
        this.isLoading = false;
      }
    },
    async fetchScannedSTOData() {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      
      this.isLoading = true;

      try {
        const response = await useScannedSTOService.fetchScannedTagIfp({
          start: this.params.start,
          end: this.params.end || this.params.start 
        });

        if (!response.data) {
          throw new Error('No data received from server');
        }
        
        if (response.data.success === false) {
          notificationStore.showAlertError(
            response.data.message || 'Gagal mengambil data scanned STO'
          );
          this.scannedTags = [];
          this.scannedTable = [];
          return;
        }
        
        const dataArray = Array.isArray(response.data) 
          ? response.data 
          : response.data?.data || [];
          
        this.scannedTags = dataArray as ScannedTagRawItem[];
        
        this.scannedTable = dataArray.map((item: ScannedTagRawItem): ScannedItem => ({
          id_tag_ok: item.id_tag_ok || '',
          date: item.date || '',
          shift: item.shift || '',
          line_id: item.line_id || '',
          part_number: item.part_number || '',
          job_number: item.job_number || '',
          project: item.project || '',
          qty: item.qty?.toString() || '0',
          scan_in_date: item.scan_in_date || '',
          scan_in_user: item.scan_in_user || ''
        }));
        
        if (this.scannedTable.length > 0) {
          notificationStore.showAlertSuccess(
            `Berhasil memuat ${this.scannedTable.length} data item`
          );
        }
        
      } catch (error) {
        utilityStore.onError(error);
        this.scannedTags = [];
        this.scannedTable = [];
        notificationStore.showAlertError('Gagal Memuat data');
      } finally {
        this.isLoading = false;
      }
    },

    resetFilter() {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      const lastWeekStr = lastWeek.toISOString().slice(0, 10);
      
      this.params.start = lastWeekStr;
      this.params.end = todayStr;
    },
    
    setTodayRange() {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      
      this.params.start = todayStr;
      this.params.end = todayStr;
    },
    
    setYesterdayRange() {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      this.params.start = yesterdayStr;
      this.params.end = yesterdayStr;
    },
    
    setThisWeekRange() {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      
      const firstDayOfWeek = new Date(today);
      firstDayOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Senin
      const firstDayStr = firstDayOfWeek.toISOString().slice(0, 10);
      
      this.params.start = firstDayStr;
      this.params.end = todayStr;
    },
    
    setThisMonthRange() {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstDayStr = firstDayOfMonth.toISOString().slice(0, 10);
      
      this.params.start = firstDayStr;
      this.params.end = todayStr;
    },
    
    getExcelExportUrl(): string {
      const { start, end } = this.params;
      const baseUrl = 'http://192.168.10.67/majsf_rest_api/api/scan_barcode/export_scan_sto_ifp';
      
      if (end) {
        return `${baseUrl}?start=${start}&end=${end}`;
      }
      
      return `${baseUrl}?start=${start}&end=${start}`;
    },
    
    isDateRangeValid(): boolean {
      const { start, end } = this.params;
      
      if (!start) return false;
      if (end && new Date(start) > new Date(end)) return false;
      
      return true;
    },
 
    getChartData() {
      const dataByDate = this.scannedTable.reduce((acc, item) => {
        const date = item.date;
        if (!acc[date]) {
          acc[date] = {
            date,
            count: 0,
            qty: 0
          };
        }
        acc[date].count++;
        acc[date].qty += parseInt(item.qty) || 0;
        return acc;
      }, {} as Record<string, { date: string; count: number; qty: number }>);
      
      return Object.values(dataByDate).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }
  }
});