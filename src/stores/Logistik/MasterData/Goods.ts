import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useGoodsService } from '@/services/Logistik/MasterData/GoodsService';
import type { 
  GoodsState, 
  GoodsItem, 
  GoodsFormData, 
  GoodsFilter,
  DatatablesFilters,
  InventarisType
} from '@/types/Logistik/MasterData/Goods';

export const useGoodsStore = defineStore('Master Data Consumable', {
  state: (): GoodsState => ({
    dataTable: [],
    filter: {
      period: new Date().toISOString().slice(0, 7),
      year: new Date().getFullYear().toString(),
      inventaris: 'CONSUMABLE',
      category: ''
    },
    formDataIncoming: {
      code_material: '',
      material_description: '',
      lokasi: '',
      satuan: '',
      pcs_day: '',
      photoPreview: ''
    },
    dialog: {
      form: false,
      detail: false,
      masterData: false,
      delete: false
    },
    action: 'Create',
    urlPreview: null,
    judulMasterData: '',
    datatables: {
      items: [],
      filters: {
        code_material: '',
        material_description: '',
        lokasi: '',
        satuan: '',
        pcs_day: ''
      }
    },
    datatablesRundown: {
      items: [],
      filters: {
        code_material: '',
        material_description: '',
        lokasi: '',
        satuan: '',
        pcs_day: ''
      }
    },
    list: {
      inventaris: ['CONSUMABLE', 'SPARE_PART', 'TOOL']
    },
    deleteData: {
      code_material: '',
      material_description: ''
    },
    isDeleting: false
  }),

  getters: {
    filteredItems: (state): GoodsItem[] => {
      return state.datatables.items.filter((item) => {
        return (Object.keys(state.datatables.filters) as Array<keyof DatatablesFilters>).every((key) => {
          const filterValue = state.datatables.filters[key];
          const itemValue = item[key];
          
          return filterValue.length < 1 || 
                 (typeof itemValue === 'string' && itemValue.toLowerCase().includes(filterValue.toLowerCase()));
        });
      });
    },

    filteredItemsRundown: (state): GoodsItem[] => {
      return state.datatablesRundown.items.filter((item) => {
        return (Object.keys(state.datatablesRundown.filters) as Array<keyof DatatablesFilters>).every((key) => {
          const filterValue = state.datatablesRundown.filters[key];
          const itemValue = item[key];
          
          return filterValue.length < 1 || 
                 (typeof itemValue === 'string' && itemValue.toLowerCase().includes(filterValue.toLowerCase()));
        });
      });
    }
  },

  actions: {
    async fetchMasterDataGoods(type?: string): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = useGoodsService();

        const dataType = type || this.filter.category || 'CONSUMABLE';
        const data = await service.fetchMasterDataGoods(dataType);

        this.dataTable = data;
        this.datatables.items = data;

        if (type) {
          this.judulMasterData = type;
          this.dialog.masterData = true;
        }

        notificationStore.loading = false;
      } catch (error) {
        notificationStore.loading = false;
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data master goods';
        notificationStore.showAlertError(errorMessage);
      }
    },

    async fetchMasterData(category: string): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = useGoodsService();

        this.filter.category = category;
        this.filter.inventaris = category.toUpperCase();

        const data = await service.fetchMasterDataGoods(category);

        this.dataTable = data;
        this.datatables.items = data;
        this.dialog.masterData = true;
        this.judulMasterData = category;

        notificationStore.loading = false;
      } catch (error) {
        notificationStore.loading = false;
        const errorMessage = error instanceof Error ? error.message : `Gagal memuat data kategori ${category}`;
        notificationStore.showAlertError(errorMessage);
      }
    },

    async fetchMasterConsumable(codeMaterial: string): Promise<GoodsItem[]> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = useGoodsService();
        const data = await service.fetchMasterConsumable(codeMaterial);

        if (codeMaterial && codeMaterial !== 'empty' && data.length > 0) {
          const item = data[0];
          this.formDataIncoming = {
            code_material: item.code_material,
            material_description: item.material_description,
            lokasi: item.lokasi,
            satuan: item.satuan,
            pcs_day: item.pcs_day,
            photoPreview: ''
          };
          this.dialog.detail = true;
        } else {
          this.resetForm();
        }

        notificationStore.loading = false;
        return data;
      } catch (error) {
        notificationStore.loading = false;
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat detail consumable';
        notificationStore.showAlertError(errorMessage);
        return [];
      }
    },

    async onUpdateGoods(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = useGoodsService();

        const type = this.filter.inventaris || 'CONSUMABLE';

        const response = await service.updateGoods(this.formDataIncoming, this.action, type);

        await this.fetchMasterData(this.filter.category);

        this.dialog.form = false;
        this.resetForm();

        notificationStore.onApiResponseToastAlert(response);

        notificationStore.loading = false;
      } catch (error) {
        notificationStore.loading = false;
        const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan data goods';
        notificationStore.showAlertError(errorMessage);
      }
    },

    loadDataMasterGoods(action: 'Create' | 'Edit', data?: Partial<GoodsItem>): void {
      this.action = action;

      if (action === 'Edit' && data) {
        this.formDataIncoming = {
          code_material: data.code_material || '',
          material_description: data.material_description || '',
          lokasi: data.lokasi || '',
          satuan: data.satuan || '',
          pcs_day: data.pcs_day || '',
          photoPreview: ''
        };
      } else {
        this.resetForm();
      }

      this.dialog.form = true;
    },

    resetForm(): void {
      this.formDataIncoming = {
        code_material: '',
        material_description: '',
        lokasi: '',
        satuan: '',
        pcs_day: '',
        photoPreview: ''
      };
      this.urlPreview = null;
      this.action = 'Create';
    },

    getImgUrl(codeMaterial: string, imageTimestamp?: number): string {
      const service = useGoodsService();
      return service.getImageUrl(codeMaterial, imageTimestamp);
    },

    updateFilter(key: keyof GoodsFilter, value: string): void {
      this.filter[key] = value;
    },

    updateDatatableFilter(key: keyof DatatablesFilters, value: string): void {
      this.datatables.filters[key] = value;
    },

    updateFormData(key: keyof GoodsFormData, value: string | File): void {
      if (key === 'photo' && value instanceof File) {
        this.formDataIncoming.photo = value;
      } else if (key === 'photoPreview' && typeof value === 'string') {
        this.formDataIncoming.photoPreview = value;
      } else if (typeof value === 'string') {
        this.formDataIncoming[key as Exclude<keyof GoodsFormData, 'photo' | 'photoPreview'>] = value;
      }
    },

    async deleteGoods(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        this.isDeleting = true;

        if (!this.deleteData.code_material) {
          throw new Error('Tidak ada data yang dipilih untuk dihapus');
        }

        const service = useGoodsService();
        const response = await service.deleteGoods(
          this.deleteData.code_material, 
          this.filter.category || 'CONSUMABLE'
        );

        await this.fetchMasterData(this.filter.category);

        this.dialog.delete = false;
        this.deleteData = {
          code_material: '',
          material_description: ''
        };
        this.isDeleting = false;

        notificationStore.onApiResponseToastAlert(response?.data, () => {
          console.log('Data berhasil dihapus');
        });
      } catch (error) {
        this.isDeleting = false;
        const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus data goods';
        notificationStore.showAlertError(errorMessage);
      }
    },

    confirmDelete(codeMaterial: string, materialDescription: string): void {
      this.deleteData = {
        code_material: codeMaterial,
        material_description: materialDescription
      };
      this.dialog.delete = true;
    },

    resetFilters(): void {
      this.datatables.filters = {
        code_material: '',
        material_description: '',
        lokasi: '',
        satuan: '',
        pcs_day: ''
      };
    }
  }
});