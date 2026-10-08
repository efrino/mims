import { defineStore } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useUtilityStore } from "@/stores/utility";
import { useNotificationStore } from "@/stores/notification";
import {
  addUtilization,
  adjustQtySupply,
  cancelTp,
  fetchReservationList,
  fetchSupplyHistory,
  fetchSupplyHistoryBulk,
  fetchUtilizations,
  searchMaterial,
  syncFromSap,
  transferPosting
} from "@/services/Logistik/IRM/Transaction/SupplyMaterial";
import type {
  AddUtilizationPayload,
  AdjustItemPayload,
  FilterDateSupply,
  SapMaterialItem,
  SupplyLogEntry,
  SupplyLogItem,
  SupplyMaterialItem,
  UtilizationItem
} from "@/types/Logistik/IRM/Transaction/SupplyMaterial";

const authStore = useAuthStore();
const utilityStore = useUtilityStore();
const notificationStore = useNotificationStore();
const date = utilityStore.getCurrentShift();

// Validasi backend dibalas HTTP 400 + { message }. Ambil pesannya supaya yang
// tampil ke user adalah alasan spesifik (mis. "melebihi Qty IFRM"), bukan
// pesan error generik.
const apiErrorMessage = (error: unknown): string | null => {
  const response = (error as { response?: { data?: { message?: string } } })?.response;
  return response?.data?.message ?? null;
};

// Normalisasi nama line (PRVBE dari SAP suka ada variasi/karakter nyasar,
// mis. "SA-LINEE." -> "LINE E"). Samakan persis dengan formatLineName di display.
const SMALL_PRESS_ALIASES = ["SA-LINEP", "SA-LINESP", "SA-LINE SP", "SA-LINE P"];

export const formatLineName = (prvbe: string): string => {
  if (!prvbe || prvbe.trim() === "") return "Line -";
  const trimmed = prvbe.trim().toUpperCase();
  if (SMALL_PRESS_ALIASES.some((a) => a.toUpperCase() === trimmed)) return "LINE SMALL PRESS";
  const match = trimmed.match(/^SA-LINE\s*([A-Z0-9]+)/);
  if (match?.[1]) return `LINE ${match[1]}`;
  return trimmed;
};

// Kolom Tanggal memakai req_date (tanggal kebutuhan dari SAP / BDTER).
// Jam tetap dari created_at karena BDTER hanya berisi tanggal.
export const formatTanggal = (value: string): string => {
  const datePart = value?.split(" ")[0];
  if (!datePart) return "-";
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return "-";
  return `${d}/${m}/${y.slice(2)}`;
};

export const formatJam = (value: string): string => {
  const timePart = value?.split(" ")[1];
  return timePart ? timePart.slice(0, 5) : "-";
};

export const useSupplyMaterialStore = defineStore("LogistikIrmSupplyMaterial", {
  state: () => ({
    dataTable: [] as SupplyMaterialItem[],
    history: [] as SupplyLogItem[],
    utilizations: [] as UtilizationItem[],
    filterLine: "All",
    keyword: "",
    filterDate: {
      start: new Date(new Date(date.date).setDate(new Date(date.date).getDate() - 1)).toISOString().slice(0, 10),
      end: date.date,
    } as FilterDateSupply,
    permissions: {
      create: authStore.checkAccess("Logistik.Create.InputQtySupplyIrm"),
      update: authStore.checkAccess("Logistik.Update.InputQtySupplyIrm"),
    },
    // Hasil pencarian material dari SAP (form item pemanfaatan)
    materialResults: [] as SapMaterialItem[],
    // Pesan non-error dari tabel I_RETURN SAP, ditampilkan saat hasil kosong
    materialMessage: "",
    isSearchingMaterial: false,
    hasSearchedMaterial: false,
    isSaving: false,
    isLoadingHistory: false,
    isLoadingUtilizations: false,
    isExporting: false,
  }),

  getters: {
    lineOptions: (state): string[] => {
      const lines = new Set(state.dataTable.map((row) => formatLineName(row.line)));
      return ["All", ...Array.from(lines).sort()];
    },

    filteredRows: (state): SupplyMaterialItem[] => {
      const keyword = state.keyword.trim().toLowerCase();

      return state.dataTable.filter((row) => {
        const matchLine = state.filterLine === "All" || formatLineName(row.line) === state.filterLine;
        const matchKeyword =
          !keyword ||
          row.no_reservasi.toLowerCase().includes(keyword) ||
          row.part_no.toLowerCase().includes(keyword) ||
          row.job_no.toLowerCase().includes(keyword);
        const rowDate = row.req_date ?? row.created_at?.split(" ")[0] ?? "";
        const matchDate =
          (!state.filterDate.start || rowDate >= state.filterDate.start) &&
          (!state.filterDate.end || rowDate <= state.filterDate.end);

        return matchLine && matchKeyword && matchDate;
      });
    },

    // Semua item dalam satu no reservasi - dipakai modal Edit & modal TP, karena
    // keduanya diproses per no reservasi.
    itemsOfReservation: (state) => (no_reservasi: string): SupplyMaterialItem[] =>
      state.dataTable
        .filter((row) => row.no_reservasi === no_reservasi)
        .sort((a, b) => a.no_item.localeCompare(b.no_item)),
  },

  actions: {
    async fetchTableData() {
      notificationStore.loading = true;

      try {
        const res = await fetchReservationList();

        // res.status = HTTP status; res.data = body backend { status, data }
        if (res.status !== 200 || !res.data?.status) {
          notificationStore.showDialogWarning("Warning", "Terjadi kesalahan saat mengambil data");
          return;
        }

        this.dataTable = res.data.data as SupplyMaterialItem[];
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    // Tombol "Refresh" - hit showAll (live SAP + upsert ke DB), lalu muat ulang dari DB.
    async refreshFromSap() {

      try {
        const res = await syncFromSap();

        if (res.status !== 200) {
          notificationStore.showAlertWarning("Gagal mengambil data terbaru dari SAP");
          return;
        }

        await this.fetchTableData();
        notificationStore.showAlertSuccess("Data berhasil di-refresh dari SAP!");
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async loadHistory(no_reservasi: string, no_item: string) {
      this.isLoadingHistory = true;
      this.history = [];

      try {
        const res = await fetchSupplyHistory(no_reservasi, no_item);
        if (res.status === 200 && res.data?.status) {
          this.history = res.data.data as SupplyLogItem[];
        }
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        this.isLoadingHistory = false;
      }
    },

    // Download Excel
    async downloadExcel(): Promise<boolean> {
      const rows = this.filteredRows;

      if (!rows.length) {
        notificationStore.showAlertWarning("Tidak ada data untuk diunduh pada filter yang dipilih!");
        return false;
      }

      this.isExporting = true;

      try {
        const logMap = new Map<string, SupplyLogItem[]>();

        try {
          const noReservasiList = Array.from(new Set(rows.map((row) => row.no_reservasi)));
          const res = await fetchSupplyHistoryBulk(noReservasiList);

          if (res.status === 200 && res.data?.status) {
            for (const log of res.data.data as SupplyLogEntry[]) {
              const key = `${log.no_reservasi}::${log.no_item}`;
              const bucket = logMap.get(key);
              if (bucket) bucket.push(log);
              else logMap.set(key, [log]);
            }
          } else {
            notificationStore.showAlertWarning("Riwayat perubahan gagal diambil, file diunduh tanpa riwayat.");
          }
        } catch (error) {
          console.error("Gagal mengambil riwayat untuk Excel:", error);
          notificationStore.showAlertWarning("Riwayat perubahan gagal diambil, file diunduh tanpa riwayat.");
        }

        // Dimuat saat dibutuhkan supaya exceljs tidak ikut bundle halaman ini.
        const { downloadSupplyMaterialExcel } = await import(
          "@/services/Logistik/IRM/Transaction/SupplyMaterialExcel"
        );

        await downloadSupplyMaterialExcel(
          rows.map((item) => ({ item, logs: logMap.get(`${item.no_reservasi}::${item.no_item}`) ?? [] })),
          {
            start: this.filterDate.start,
            end: this.filterDate.end,
            line: this.filterLine,
          }
        );

        notificationStore.showAlertSuccess("File Excel berhasil diunduh!");
        return true;
      } catch (error) {
        utilityStore.onError(error);
        notificationStore.showAlertWarning("Gagal membuat file Excel!");
        return false;
      } finally {
        this.isExporting = false;
      }
    },

    // Cari material di SAP untuk form item pemanfaatan.
    async searchMaterialSap(keyword: string) {
      if (!keyword.trim()) {
        notificationStore.showAlertError("Masukkan Part Number / Job Number terlebih dahulu!");
        return;
      }

      this.isSearchingMaterial = true;
      this.materialResults = [];
      this.materialMessage = "";

      try {
        const res = await searchMaterial(keyword.trim());

        if (res.status === 200 && res.data?.status) {
          this.materialResults = res.data.data as SapMaterialItem[];
          this.materialMessage = res.data.message || "";
        } else {
          notificationStore.showAlertWarning(res.data?.message || "Gagal mencari material di SAP!");
        }
      } catch (error) {
        const message = apiErrorMessage(error);
        if (message) {
          notificationStore.showAlertWarning(message);
        } else {
          utilityStore.onError(error);
          notificationStore.showAlertWarning("Gagal mencari material di SAP!");
        }
      } finally {
        this.isSearchingMaterial = false;
        this.hasSearchedMaterial = true;
      }
    },

    resetMaterialSearch() {
      this.materialResults = [];
      this.materialMessage = "";
      this.hasSearchedMaterial = false;
    },

    async loadUtilizations(no_reservasi: string) {
      this.isLoadingUtilizations = true;
      this.utilizations = [];

      try {
        const res = await fetchUtilizations(no_reservasi);
        if (res.status === 200 && res.data?.status) {
          this.utilizations = res.data.data as UtilizationItem[];
        }
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        this.isLoadingUtilizations = false;
      }
    },

    // Simpan perubahan qty supply beberapa item sekaligus (all-or-nothing di backend).
    // Return true kalau berhasil, supaya view bisa menutup modal.
    async saveAdjustments(no_reservasi: string, items: AdjustItemPayload[]): Promise<boolean> {
      const changed = items.filter((item) => (item.qty_plus || 0) !== 0 || (item.qty_minus || 0) !== 0);

      if (!changed.length) {
        notificationStore.showAlertError("Isi qty tambah atau qty kurang minimal pada satu item!");
        return false;
      }

      this.isSaving = true;
      // Loading global (sama seperti halaman lain) - prosesnya menembak SAP
      // per item, jadi bisa terasa lama dan perlu terlihat jelas.
      notificationStore.loading = true;

      try {
        const res = await adjustQtySupply({ no_reservasi, items: changed });

        if (res.status === 200 && res.data?.status) {
          notificationStore.showAlertSuccess(res.data.message || "Qty Supply berhasil disimpan!");
          await this.fetchTableData();
          return true;
        }

        notificationStore.showAlertWarning(res.data?.message || "Gagal menyimpan Qty Supply!");
        await this.fetchTableData();
        return false;
        
      } catch (error) {
        const message = apiErrorMessage(error);
        if (message) {
          notificationStore.showAlertWarning(message);
        } else {
          utilityStore.onError(error);
          notificationStore.showAlertWarning("Gagal menyimpan Qty Supply!");
        }
        await this.fetchTableData();
        return false;
      } finally {
        this.isSaving = false;
        notificationStore.disableLoading();
      }
    },

    // Simpan item baru / pemanfaatan, lalu tarik ulang dari SAP supaya kalau
    // itemnya sudah ada di SAP langsung muncul sebagai baris reservasi.
    // Cukup scope hari ini - item yang baru ditambahkan pasti kebutuhan hari ini,
    // dan menarik sebulan penuh membuat user menunggu jauh lebih lama.
    async saveUtilization(payload: AddUtilizationPayload): Promise<boolean> {
      this.isSaving = true;
      notificationStore.loading = true;

      try {
        const res = await addUtilization(payload);

        if (res.status === 200 && res.data?.status) {
          notificationStore.showAlertSuccess(res.data.message || "Item berhasil disimpan!");

          // Kegagalan sync tidak membatalkan penyimpanan yang sudah berhasil.
          try {
            await syncFromSap("day");
          } catch (error) {
            console.error("Sync SAP setelah simpan item gagal:", error);
          }

          await this.fetchTableData();
          await this.loadUtilizations(payload.no_reservasi);
          return true;
        }

        notificationStore.showAlertWarning(res.data?.message || "Gagal menyimpan item!");
        return false;
      } catch (error) {
        const message = apiErrorMessage(error);
        if (message) {
          notificationStore.showAlertWarning(message);
        } else {
          utilityStore.onError(error);
          notificationStore.showAlertWarning("Gagal menyimpan item!");
        }
        return false;
      } finally {
        this.isSaving = false;
        notificationStore.disableLoading();
      }
    },

    // TP per no reservasi. problems = { no_item: pesan } untuk item yang qty-nya beda.
    async submitTransferPosting(
      no_reservasi: string,
      problems: Record<string, string>,
      posting_date: string
    ): Promise<boolean> {
      if (!posting_date) {
        notificationStore.showAlertError("Posting date wajib diisi!");
        return false;
      }

      this.isSaving = true;
      notificationStore.loading = true;

      try {
        const res = await transferPosting({ no_reservasi, problems, posting_date });

        if (res.status === 200 && res.data?.status) {
          notificationStore.showAlertSuccess(res.data.message || "Transfer Posting berhasil!");

          // SAP bisa MENGHAPUS item saat TP (mis. yang qty supply-nya 0), jadi
          // data ditarik ulang dari SAP - cukup scope hari ini supaya ringan.
          // Kalau sync gagal, tabel tetap dimuat ulang dari DB.
          try {
            await syncFromSap("day");
          } catch (error) {
            console.error("Sync SAP setelah TP gagal:", error);
          }

          await this.fetchTableData();
          return true;
        }

        notificationStore.showAlertWarning(res.data?.message || "Gagal melakukan Transfer Posting!");
        return false;
      } catch (error) {
        const message = apiErrorMessage(error);
        if (message) {
          notificationStore.showAlertWarning(message);
        } else {
          utilityStore.onError(error);
          notificationStore.showAlertWarning("Gagal melakukan Transfer Posting!");
        }
        return false;
      } finally {
        this.isSaving = false;
        notificationStore.disableLoading();
      }
    },

    // Batal TP - acuannya nomor material dokumen; selama mat_doc dari SAP belum
    // ada, backend memakai no_reservasi (1 mat doc = 1 no reservasi).
    async cancelTransferPosting(row: SupplyMaterialItem, reason: string): Promise<boolean> {
      this.isSaving = true;

      try {
        const res = await cancelTp({
          mat_doc: row.mat_doc,
          no_reservasi: row.no_reservasi,
          reason,
        });

        if (res.status === 200 && res.data?.status) {
          notificationStore.showAlertSuccess(res.data.message || "TP berhasil dibatalkan!");
          await this.fetchTableData();
          return true;
        }

        notificationStore.showAlertWarning(res.data?.message || "Gagal membatalkan TP!");
        return false;
      } catch (error) {
        const message = apiErrorMessage(error);
        if (message) {
          notificationStore.showAlertWarning(message);
        } else {
          utilityStore.onError(error);
          notificationStore.showAlertWarning("Gagal membatalkan TP!");
        }
        return false;
      } finally {
        this.isSaving = false;
      }
    },
  },
});
