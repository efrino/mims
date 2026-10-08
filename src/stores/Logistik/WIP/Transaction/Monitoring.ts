import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { monitoringService } from '@/services/Logistik/WIP/Transaction/MonitoringService';
import type { 
  MonitoringState, 
  MonitoringItem, 
  FilterDate,
  TableFilters,
  MasterDataForm,
  UploadDataItem 
} from '@/types/Logistik/WIP/Transaction/Monitoring';

const getDefaultState = (): MonitoringState => {
  const now = new Date();
  const currentYear = String(now.getFullYear());
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  
  return {
    filterDate: {
      year: currentYear,
      month: currentMonth,
    },
    items: [],
    loading: false,
    error: null,
    filters: {
      part_number: '',
      line_id: '',
    },
  };
};

export const useMonitoringStore = defineStore('Monitoring', {
  state: (): MonitoringState => getDefaultState(),

  getters: {
    period: (state): string => {
      return `${state.filterDate.year}-${state.filterDate.month.padStart(2, '0')}`;
    },
    
    isEmpty: (state): boolean => {
      return state.items.length === 0 && !state.loading;
    },
    
    filteredItems: (state): MonitoringItem[] => {
      const { part_number, line_id } = state.filters;
      
      if (!part_number && !line_id) {
        return state.items;
      }
      
      return state.items.filter(item => {
        const matchesPartNumber = part_number 
          ? item.part_number.toLowerCase().includes(part_number.toLowerCase())
          : true;
        
        const matchesLineId = line_id
          ? item.line_id.toLowerCase().includes(line_id.toLowerCase())
          : true;
        
        return matchesPartNumber && matchesLineId;
      });
    },

    uniqueLines: (state): string[] => {
      const lines = state.items.map(item => item.line_id);
      return [...new Set(lines)].sort();
    },
    
    stats: (state) => {
      return {
        totalItems: state.items.length,
        filteredItems: state.items.length,
        lhItems: state.items.filter(item => item.type_part === 'LH').length,
        rhItems: state.items.filter(item => item.type_part === 'RH').length,
        hasData: state.items.length > 0,
      };
    },
  },

  actions: {
    setFilterDate(filterDate: FilterDate): void {
      this.filterDate = filterDate;
    },
    
    setFilters(filters: Partial<TableFilters>): void {
      this.filters = { ...this.filters, ...filters };
    },
    
    resetFilters(): void {
      this.filters = {
        part_number: '',
        line_id: '',
      };
    },
    
    resetStore(): void {
      Object.assign(this, getDefaultState());
    },
    
    async fetchMonitoringData(): Promise<void> {
      const notificationStore = useNotificationStore();
      this.error = null;
      
      if (!monitoringService.validatePeriod(this.period)) {
        this.error = 'Format periode tidak valid. Gunakan format YYYY-MM';
        notificationStore.showAlertError(this.error);
        return;
      }
      
      this.loading = true;
      notificationStore.loading = true;
      
      try {
        const data = await monitoringService.fetchMonitoringData({
          period: this.period,
        });
        
        this.items = data;
        
        if (data.length > 0) {
          notificationStore.showAlertSuccess(`Data berhasil dimuat: ${data.length} item`);
        } else {
          notificationStore.showAlertError('Tidak ada data ditemukan untuk periode ini');
        }
        
      } catch (error: any) {
        this.error = error.message;
        this.items = [];
        notificationStore.showAlertError(`Gagal memuat data: ${error.message}`);
        console.error('Error fetching monitoring data:', error);
        
      } finally {
        this.loading = false;
        notificationStore.loading = false;
      }
    },

    async uploadData(typeData: string, items: UploadDataItem[], period?: string): Promise<boolean> {
      const notificationStore = useNotificationStore();
      
      if (!items || items.length === 0) {
        notificationStore.showAlertWarning('Data yang anda kirim tidak lengkap');
        return false;
      }

      notificationStore.loading = true;
      
      try {
        const response = await monitoringService.uploadData({
          period: period ?? this.period,
          type_data: typeData,
          items: items
        });

        if (response.status === 200) {
          const isSuccess = response.data.success;
          const tmp = document.createElement('DIV');
          tmp.innerHTML = response.data.messages || '';
          const displayMessage = tmp.textContent || tmp.innerText || '';
          
          if (isSuccess) {
            await this.fetchMonitoringData();
            notificationStore.showAlertSuccess(displayMessage || 'Data berhasil diupload');
            return true;
          } else {
            notificationStore.showAlertError(displayMessage || 'Gagal mengupload data');
            return false;
          }
        } else {
          notificationStore.showAlertError('Gagal mengupload data');
          return false;
        }
        
      } catch (error: any) {
        const message = error.response?.data?.message || error.message;
        notificationStore.showAlertError(`Gagal mengupload data: ${message}`);
        console.error('Error uploading data:', error);
        return false;
        
      } finally {
        notificationStore.loading = false;
      }
    },

    async updateMasterData(formData: MasterDataForm): Promise<boolean> {
      const notificationStore = useNotificationStore();
      notificationStore.loading = true;
      
      try {
        const requiredFields = ['part_number', 'job_number', 'line_id'];
        const missingFields = requiredFields.filter(field => !formData[field as keyof MasterDataForm]);
        
        if (missingFields.length > 0) {
          notificationStore.showAlertWarning('Data yang anda kirim tidak lengkap.');
          notificationStore.loading = false;
          return false;
        }

        const updateParams = {
          period: this.period,
          part_number: formData.part_number,
          job_number: formData.job_number,
          part_finish: formData.part_finish || '',
          line_id: formData.line_id,
          stock_awal: formData.stock_awal || '0',
          part_name: formData.part_name || '',
        };

        const response = await monitoringService.updateMasterData(updateParams);

        if (response.status === 200 || response.status === 201) {
          notificationStore.showAlertSuccess('Data berhasil diperbarui');
          await this.fetchMonitoringData();     
          return true;
        } else {
          notificationStore.showAlertError('Gagal memperbarui data');
          return false;
        }
        
      } catch (error: any) {
        const message = error.response?.data?.message || error.message;
        notificationStore.showAlertError(`Gagal memperbarui data: ${message}`);
        console.error('Error updating master data:', error);
        return false;
        
      } finally {
        notificationStore.loading = false;
      }
    },
    
    async fetchDataWithPeriod(period: string): Promise<void> {
      const notificationStore = useNotificationStore();
      try {
        const filterDate = monitoringService.parsePeriod(period);
        this.setFilterDate(filterDate);
        await this.fetchMonitoringData();
      } catch (error: any) {
        this.error = error.message;
        notificationStore.showAlertError(error.message);
      }
    },
    
    async fetchCurrentPeriodData(): Promise<void> {
      const currentPeriod = monitoringService.getCurrentPeriod();
      await this.fetchDataWithPeriod(currentPeriod);
    },

    async goToPreviousMonth(): Promise<void> {
      const currentYear = parseInt(this.filterDate.year);
      const currentMonth = parseInt(this.filterDate.month);
      
      let newYear = currentYear;
      let newMonth = currentMonth - 1;
      
      if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
      
      this.filterDate = {
        year: String(newYear),
        month: String(newMonth).padStart(2, '0'),
      };
      
      await this.fetchMonitoringData();
    },
    
    async goToNextMonth(): Promise<void> {
      const currentYear = parseInt(this.filterDate.year);
      const currentMonth = parseInt(this.filterDate.month);
      
      let newYear = currentYear;
      let newMonth = currentMonth + 1;
      
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
      
      this.filterDate = {
        year: String(newYear),
        month: String(newMonth).padStart(2, '0'),
      };
      
      await this.fetchMonitoringData();
    },
    
    calculateStock(index: number, item: MonitoringItem, type: 'LH' | 'RH'): number {
      if (!item || !item.stock_awal) return 0;
      
      let previousStock = isNaN(parseInt(item.stock_awal)) ? 0 : parseInt(item.stock_awal);
      const actData = type === 'LH' ? item.act_lh : item.act_rh;
      const keys = Object.keys(actData);
      
      if (index >= keys.length) return previousStock;
      
      for (let i = 0; i <= index; i++) {
        const key = keys[i];
        if (!key) continue;
        
        const actualProd = isNaN(parseInt(actData[key] || '0')) ? 0 : parseInt(actData[key] || '0');
        const [, , dayNum, shiftNum] = key.split('_');
        const prodWeldingKey = `prod_welding_${dayNum}_${shiftNum === '1' ? 'd' : 'n'}`;
        const prodWelding = isNaN(parseInt(item.prod_welding[prodWeldingKey] || '0')) ? 0 : parseInt(item.prod_welding[prodWeldingKey] || '0');
        
        previousStock = previousStock + actualProd - prodWelding;
      }
      
      return previousStock;
    },
    
    calculateMdfoAverage(item: MonitoringItem): number {
      if (!item || !item.mdfo) return 0;
      
      const values = Object.values(item.mdfo)
        .map(v => parseFloat(v || '0'))
        .filter(v => v > 0);
      
      if (values.length === 0) return 0;
      
      const total = values.reduce((sum, val) => sum + val, 0);
      return parseFloat((total / values.length).toFixed(2));
    },
    
    formatPeriodDisplay(period: string): string {
      if (!period) return '';
      
      try {
        const [year, month] = period.split('-');
        const monthIndex = parseInt(month) - 1;
        
        const monthNames = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        
        return `${monthNames[monthIndex]} ${year}`;
      } catch {
        return period;
      }
    },
  },
});