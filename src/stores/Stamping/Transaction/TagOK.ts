import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useUtilityStore } from '@/stores/utility';
import { connectQZTray, disconnectQZTray, getQZPrinters } from '@/utils/qzSigning';
import { usetagOKService } from '@/services/Stamping/Transaction/TagOKService';
import html2canvas from 'html2canvas';
import qz from 'qz-tray';
import type { PrintData } from 'qz-tray';
import type { FormDataTagOk, SelectPartNumber, TagOkItem } from '@/types/Stamping/Transaction/TagOK';

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const tagOKService = usetagOKService;

// Id harus beda dari store Welding ('TagOK'): id kembar membuat halaman ini memakai
// store Welding kalau halaman Welding dibuka lebih dulu.
export const useTagOkStore = defineStore('TagOKStamping', {
  state: () => {
    return {
      isPrinted: true,
      printers: [] as string[],
      selectedPrinter: '',
      timeNow: '',
      formData: {
        date: '',
        id_kanban: '',
        id_wis: '',
        qty_pallet: '',
        part_number: '',
        lotsize_actual: '',
        shift: 1,
        type: '',
        job_number: ''
      } as FormDataTagOk,
      partItemsTag: [] as SelectPartNumber[],
      table_tag: [] as Partial<TagOkItem>[],
      table_tag_num: [] as Partial<TagOkItem>[],
      selectedPart: '',
      params: utilityStore.getCurrentShift(),
      id_tag_ok: ''
    };
  },
  actions: {
    getTimeNow() {
      const now = new Date();

      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();

      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      this.timeNow = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    },
    resetPreview() {
      this.table_tag = [];
      this.table_tag_num = [];
      this.isPrinted = true;
    },

    async getPrinters() {
      try {
        const printers = await getQZPrinters();

        this.printers = Array.isArray(printers) ? printers : [printers];
      } catch (e) {
        // console.error("QZ Error:", e);
        this.printers = [];
      }
    },

    async printArea(selectedPrinter: string | null) {
      if (this.table_tag.length == 0) {
        notificationStore.showConfirm('Warning', 'Buat Tag OK terlebih dulu!');
        return;
      } else if (this.table_tag_num.length == 0) {
        notificationStore.showConfirm('Warning', 'Buat Tag OK terlebih dulu!');
        return;
      } else if (!selectedPrinter) {
        notificationStore.showConfirm('Warning', 'Pilih printer terlebih dahulu sebelum mencetak!');
        return;
      }

      notificationStore.loading = true;

      const tables = document.querySelectorAll('#print-content table');
      const images = [];

      // Render semua tabel menjadi gambar
      for (let table of tables) {
        const el = table as HTMLElement;
        const canvas = await html2canvas(el, { scale: 3 });
        images.push(canvas.toDataURL('image/png'));
      }

      try {
        await connectQZTray();

        const config = qz.configs.create(selectedPrinter, {
          orientation: 'landscape',
          scaleContent: true
        });

        // Convert base64 ke format yang diterima QZ
        const printData = images.map((img) => ({
          type: 'image',
          format: 'base64',
          data: img.replace(/^data:image\/png;base64,/, '')
        })) as unknown as PrintData[];

        // Print langsung
        await qz.print(config, printData);

        this.isPrinted = true;
        this.table_tag = [];
        this.table_tag_num = [];

        notificationStore.showAlertSuccess('Berhasil mencetak TAG OK.');

        this.formData.id_kanban = '';
      } catch (e: any) {
        console.error('QZ Error:', e);

        if (e.message && e.message.includes('Printer is not accepting job')) {
          notificationStore.showConfirm('Error', `Printer "${selectedPrinter}" tidak ditemukan. Pastikan printer terhubung dan menyala.`);
          return;
        } else {
          notificationStore.showConfirm(
            'Error',
            `Gagal mencetak tag. Pastikan aplikasi QZ Tray berjalan dan printer terhubung.\nDetail: ${e.message || e}`
          );
          return;
        }
      } finally {
        // Disconnect from QZ Tray
        await disconnectQZTray();
        notificationStore.loading = false;
      }
    },

    async onScanKanban(data: string) {
      try {
        const response = await tagOKService.scanTagOkKanban({
          date: this.params.date,
          shift: this.params.shift.toString(),
          id_kanban: data
        });

        if (response.data.success === true) {
          const params = JSON.stringify({
            id_kanban: data
          });
          this.table_tag = response.data.data;
          this.table_tag_num = response.data.data;

          notificationStore.loading = false;
        } else {
          utilityStore.onApiResponse(response);
          notificationStore.loading = false;
        }
      } catch (error) {
        notificationStore.loading = false;
        notificationStore.showAlertWarning('Terjadi kesalahan saat mengambil data');
        utilityStore.onError(error);
      }
    },
    // TagOkByKanban
    async fetchDataTagOK(parameter_tag: string) {
      try {
        notificationStore.loading = true;
        const response = await usetagOKService.fetchDataByKanban(parameter_tag);

        if (response.status === 200) {
          this.table_tag = response.data;
          this.table_tag_num = response.data;
          notificationStore.disableLoading();
          return response.data;
        } else {
          utilityStore.onApiResponse(response);
          return [];
        }
      } catch (error) {
        utilityStore.onError(error);
        return [];
      }
    },
    async fetchDataPartSTP(type: string) {
      notificationStore.loading = true;

      this.partItemsTag = [];

      try {
        const response = await tagOKService.getPartNumber(type);

        if (response.status === 200) {
          this.partItemsTag = (response.data as SelectPartNumber[]).map((item) => ({ ...item, type: item.status }));
        } else {
          utilityStore.onApiResponse(response);
          this.partItemsTag = [];
        }
      } catch (error) {
        this.partItemsTag = [];
      } finally {
        notificationStore.disableLoading();
      }
    },
    async previewTagOk() {
      notificationStore.loading = true;
      if (this.formData.part_number && Number(this.formData.lotsize_actual) > 0 && this.formData.date) {
        if (!Number.isInteger(Number(this.formData.lotsize_actual) / Number(this.formData.qty_pallet))) {
          notificationStore.showConfirm('Warning!!!', 'Jumlah PCS tidak kelipatan 1 Kanban!');
        } else {
          try {
            const response = await usetagOKService.createTagOkService(this.formData);

            if (response.data.success === true) {
              // const tagData = await usetagOKService.getTagOkService(this.formData);
              this.table_tag = response.data.data;
              this.table_tag_num = response.data.data;
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.loading = false;
          } catch (error) {
            console.error('Error in printTagOk:', error);
            utilityStore.onError(error);
            notificationStore.loading = false;
          }
        }
        notificationStore.loading = false;
      } else {
        notificationStore.loading = false;
        notificationStore.showAlertWarning('Data yang anda kirim tidak Lengkap.');
      }
    }
  }
});
