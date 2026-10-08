import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import moment from 'moment';
import { useNotificationStore } from '@/stores/notification';
import { useUtilityStore } from '@/stores/utility';
import { useConfigStore } from '@/stores/config';
import { useAuthStore } from '@/stores/auth';
import { usePrintBarcodeService } from '@/services/Logistik/IFP/Transaction/PrintBarcodeService';
import { connectQZTray, disconnectQZTray, getQZPrinters } from '@/utils/qzSigning';
import qz from 'qz-tray';
import html2canvas from 'html2canvas';
import type { PrintData } from "qz-tray";
import type {
  PrintBarcodeFormData,
  PrintBarcodeFormRepeat,
  PrintBarcodeItem,
  PrintBarcodeFilter,
  PrintBarcodeFilter1,
  PrintBarcodeList,
  PrintBarcodeDialog,
} from '@/types/Logistik/IFP/Transaction/PrintBarcode';

export const usePrintBarcodeStore = defineStore('PrintBarcode', () => {
  const authStore = useAuthStore();
  const configStore = useConfigStore();
  const notificationStore = useNotificationStore();
  const utilityStore = useUtilityStore();
  const printBarcodeService = usePrintBarcodeService();
  const apiUrl = ref(configStore.apiUrl);
  const error = ref(0);
  
  const permissions = ref({
    create: authStore.checkAccess('Module.Create.PrintBarcode'),
  });

  const formData = ref<PrintBarcodeFormData>({
    type: '',
    dateBuild: '',
    jarak: 0,
  });

  const formRepeat = ref<PrintBarcodeFormRepeat>({
    type: '',
    from: 0,
    to: 0,
  });

  const form = ref<string[]>(['type', 'jarak', 'dateBuild']);

  const table = ref<{ items: PrintBarcodeItem[] }>({
    items: [],
  });

  const previewData = ref<{ items: PrintBarcodeItem[] }>({
    items: [],
  });

  const date = utilityStore.getCurrentShift();
  
  const filter = ref<PrintBarcodeFilter>({
    create_date: '',
  });

  const filter1 = ref<PrintBarcodeFilter1>({
    update_date: date.clock,
  });

  const list = ref<PrintBarcodeList>({
    type: [
      { text: 'Polybox 6004', value: '6004' },
      { text: 'Polybox 6644', value: '6644' },
      { text: 'Polybox 6655', value: '6655' },
      { text: 'Polybox 6675', value: '6675' },
      { text: 'Polybox 6688', value: '6688' },
      { text: 'Polybox 6699', value: '6699' },
      { text: 'Polybox D593', value: 'D593' },
      '64900-SU2ID',
      '65131-SU2ID',
      '65197-SU2ID',
      '66700-SU2ID',
      '65111/22-SU2ID',
      '57171/81-SU2ID',
      '65212/22-SU2ID',
      '71510/20-SU2ID',
      '71530/40-SU2ID',
      '64900-KS',
      '66700-KS',
      '71510/20-KS',
      '71430/40-KS',
      'C',
      'D',
      'D1',
      'D2',
      'DASH',
      'R',
      'R Special',
      'R2',
      'RD80',
      'S11',
      'S14',
      'S2',
      'S3',
      'S4',
      'S6',
      'WB11',
      'WBD11',
      'P21',
      'P21Kit',
      'MBP01',
      'MCF08',
      'MCF01',
      'MCF02',
      'MCF03',
      'MCF04',
      'MCW01',
      'MEX01',
      'MEX02',
      'MKS01',
      'MKS02',
      'MKS03',
      'MKS04',
    ],
  });

  const dialog = ref<PrintBarcodeDialog>({
    datePicker: false,
    datePickerForm: false,
    filter: false,
    upload: false,
    form: false,
  });
  
  const qzConnected = ref(false);
  const availablePrinters = ref<string | string[]>([]);
  const selectedPrinter = ref<string>('');

  const sumOf = computed(() => {
    if (table.value.items && table.value.items.length > 0) {
      return {
        jarak: table.value.items.reduce((a, b) => b.jarak, 0),
      };
    }
    return {
      jarak: 0,
    };
  });

  const lastCounter = computed(() => {
    if (table.value.items && table.value.items.length > 0) {
      const lastItem = table.value.items[table.value.items.length - 1];
      return lastItem.jarak || 0;
    }
    return 0;
  });

  const resetForm = async () => {
    await fetchDataBarcode();
    formData.value = {
      type: '',
      dateBuild: '',
      jarak: 0,
    };
    formRepeat.value = {
      type: '',
      from: 0,
      to: 0,
    };
    previewData.value.items = [];
    dialog.value.form = false;
  };

  const dateToIndo = (datestr: string): string => {
    const date = new Date(datestr);
    if (isNaN(date.getTime())) {
      return '-';
    }
    return moment(datestr).format('DD/MM/YYYY');
  };

  const fetchDataBarcode = async () => {
    notificationStore.loading = true;
    try {
      const data = await printBarcodeService.fetchDataBarcode(apiUrl.value);
      table.value.items = data;
      notificationStore.disableLoading();
    } catch (error) {
      utilityStore.onError(error);
    }
  };

  const fetchPrintDataBarcode = async () => {
    notificationStore.loading = true;
    try {
      const data = await printBarcodeService.fetchPrintDataBarcode(
        apiUrl.value,
        filter.value
      );
      
      const mappedData = data.map((item) => ({
        ...item,
        create_date: dateToIndo(item.create_date),
      }));
      previewData.value.items = mappedData;
      notificationStore.disableLoading();
    } catch (error) {
      utilityStore.onError(error);
    }
  };

  const fetchPrintRepeat = async () => {
    notificationStore.loading = true;
    try {
      const data = await printBarcodeService.fetchPrintRepeat(
        apiUrl.value,
        filter1.value
      );
      previewData.value.items = data;
      notificationStore.disableLoading();
    } catch (error) {
      utilityStore.onError(error);
    }
  };

  const addPrint = async () => {
    notificationStore.loading = true;
    
    if (!formData.value.type || !formData.value.jarak) {
      notificationStore.showAlertWarning('Data yang anda kirim tidak Lengkap.');
      notificationStore.disableLoading();
      return;
    }

    try {
      const response = await printBarcodeService.addPrint(
        apiUrl.value,
        formData.value
      );
      
      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      filter.value.create_date = formattedDate;
      
      await fetchPrintDataBarcode();
      
      notificationStore.onApiResponseToastAlert(response, () => {
        fetchDataBarcode(); 
      });
    } catch (error) {
      utilityStore.onError(error);
    }
  };

  const repeatPrint = async () => {
    notificationStore.loading = true;
    
    if (!formRepeat.value.type || !formRepeat.value.from || !formRepeat.value.to) {
      notificationStore.showAlertWarning('Data yang anda kirim tidak Lengkap.');
      notificationStore.disableLoading();
      return;
    }

    try {
      const response = await printBarcodeService.repeatPrint(
        apiUrl.value,
        formRepeat.value
      );
      
      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      filter1.value.update_date = formattedDate;
      
      await fetchPrintRepeat();
      
      notificationStore.onApiResponseToastAlert(response, () => {
        fetchDataBarcode(); 
      });
    } catch (error) {
      utilityStore.onError(error);
    }
  };

  const initializeQZ = async () => {
    try {
      await connectQZTray();
      qzConnected.value = true;
      await loadPrinters();
    } catch (error) {
      notificationStore.showAlertError('Gagal terhubung ke QZ Tray. Pastikan QZ Tray sudah berjalan.');
      qzConnected.value = false;
    }
  };

  const loadPrinters = async () => {
    try {
      const printers = await getQZPrinters();
      availablePrinters.value = printers;
      
      const printerList = Array.isArray(printers) ? printers : [];
      
      if (printerList.length > 0 && !selectedPrinter.value) {
        selectedPrinter.value = printerList[0];
      }
    } catch (error) {
      notificationStore.showAlertError('Gagal memuat daftar printer.');
    }
  };

const printBarcode = async () => {
  if (!selectedPrinter.value) {
    notificationStore.showAlertWarning('Silakan pilih printer terlebih dahulu.');
    return;
  }

  if (previewData.value.items.length === 0) {
    notificationStore.showAlertWarning('Tidak ada data untuk dicetak.');
    return;
  }

  notificationStore.loading = true;

  try {
    if (!qzConnected.value) {
      await initializeQZ();
    }

    const barcodeCards = document.querySelectorAll('.barcode-print-item');
    
    if (barcodeCards.length === 0) {
      notificationStore.showAlertError('Tidak ada preview barcode untuk dicetak.');
      notificationStore.disableLoading();
      return;
    }

    const config = qz.configs.create(selectedPrinter.value, {
      size: { 
        width: 5.9,    
        height: 2.9,    
      },
      units: 'cm',
      scaleContent: true,  
      density: 203,         
      margins: { 
        top: 0, 
        right: 0, 
        bottom: 0, 
        left: 0 
      },
      colorType: 'grayscale',
      orientation: 'portrait',
      legacy: false
    });

    for (let i = 0; i < barcodeCards.length; i++) {
      const el = barcodeCards[i] as HTMLElement;
      
      const canvas = await html2canvas(el, { 
        scale: 3,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      const imageData = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');

      const printData = [{
        type: 'image' as const,
        format: 'base64' as const,
        data: imageData
      }] as unknown as PrintData[];

      await qz.print(config, printData);
      
      if (i < barcodeCards.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }
    
    notificationStore.showAlertSuccess(
      `Berhasil mencetak ${barcodeCards.length} barcode.`
    );
    
  } catch (error) {
    console.error('Print error:', error);
    notificationStore.showAlertError(
      'Gagal mencetak barcode. Pastikan printer tersedia dan QZ Tray berjalan.'
    );
  } finally {
    notificationStore.disableLoading();
  }
};

  const disconnectQZ = async () => {
    try {
      await disconnectQZTray();
      qzConnected.value = false;
      availablePrinters.value = [];
      selectedPrinter.value = '';
    } catch (error) {
      //
    }
  };

  return {
    apiUrl,
    permissions,
    error,
    formData,
    formRepeat,
    form,
    table,
    previewData,
    filter,
    filter1,
    list,
    dialog,
    sumOf,
    lastCounter,
    qzConnected,
    availablePrinters,
    selectedPrinter,
    resetForm,
    dateToIndo,
    fetchDataBarcode,
    fetchPrintDataBarcode,
    fetchPrintRepeat,
    addPrint,
    repeatPrint,
    initializeQZ,
    loadPrinters,
    printBarcode,
    disconnectQZ,
  };
});