import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { useStoManageUserService } from '@/services/Admin/StoManageUserService';
import { keluarDariStoSesi, pastikanNikSto, readStoAdminNik } from '@/services/Admin/StoApi';
import type { StoManageUserState, StoUserFormData, StoUserRow } from '@/types/Admin/StoManageUser';

const emptyForm = (): StoUserFormData => ({
  nik: '',
  role: '',
  tim: '',
  device_id: null,
  permissions: [],
  area: []
});

export const useStoManageUserStore = defineStore('Admin STO Manage User', {
  state: (): StoManageUserState => {
    const authStore = useAuthStore();

    return {
      dataTable: [],
      devices: [],
      adminNik: readStoAdminNik(),
      isLoggingOut: false,
      search: '',
      limit: 100,
      formData: emptyForm(),
      dialog: {
        form: false,
        delete: false
      },
      action: 'Create',
      editId: null,
      deleteTarget: null,
      deleteJejak: null,
      needForce: false,
      isLoading: false,
      isSaving: false,
      isDeleting: false,
      lastError: '',
      permissions: {
        create: authStore.checkAccess('Module.Create.STOManageUser'),
        update: authStore.checkAccess('Module.Update.STOManageUser'),
        delete: authStore.checkAccess('Module.Delete.STOManageUser')
      }
    };
  },

  getters: {
    // Saran isian area & permissions diambil dari data yang sudah ada --
    // kolomnya VARCHAR bebas, jadi tetap boleh diketik manual. (Role tidak:
    // pilihannya dikunci ke daftar tetap di halaman.)
    areaOptions: (state): string[] => [...new Set(state.dataTable.flatMap((u) => u.area ?? []))].sort(),
    permissionOptions: (state): string[] => [...new Set(state.dataTable.flatMap((u) => u.permissions ?? []))].sort(),
    totalAdmin: (state): number => state.dataTable.filter((u) => (u.role ?? '').toLowerCase() === 'admin').length
  },

  actions: {
    async fetchAll(): Promise<void> {
      const notificationStore = useNotificationStore();

      // Belum ada NIK admin aktif sama sekali -- tunggu modal pilih-NIK
      // dulu, supaya tidak memanggil backend dengan nik="".
      try {
        this.adminNik = await pastikanNikSto();
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : 'NIK admin tidak tersedia.';
        this.dataTable = [];
        this.devices = [];
        return;
      }

      try {
        this.isLoading = true;
        this.lastError = '';

        const service = useStoManageUserService();
        const users = await service.fetchUsers(this.adminNik, { q: this.search, limit: this.limit });
        this.dataTable = users as StoUserRow[];

        // Daftar perangkat dipakai form; kegagalannya tidak boleh
        // menjatuhkan tabel user yang sudah berhasil dimuat.
        try {
          this.devices = await service.fetchDevices(this.adminNik);
        } catch {
          this.devices = [];
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat daftar user STO';
        this.lastError = errorMessage;
        this.dataTable = [];
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        this.isLoading = false;
      }
    },

    async onSave(): Promise<void> {
      const notificationStore = useNotificationStore();
      const currentAction = this.action;

      if (!this.formData.role.trim()) {
        notificationStore.showAlertWarning('Role wajib diisi.');
        return;
      }

      if (currentAction === 'Create' && !this.formData.nik.trim()) {
        notificationStore.showAlertWarning('NIK wajib diisi.');
        return;
      }

      try {
        this.isSaving = true;
        const service = useStoManageUserService();

        if (currentAction === 'Edit' && this.editId) {
          await service.updateUser(this.adminNik, this.editId, this.formData);
        } else {
          await service.registerUser(this.adminNik, this.formData);
        }

        await this.fetchAll();

        this.dialog.form = false;
        this.resetForm();

        const label = currentAction === 'Edit' ? 'diperbarui' : 'didaftarkan';
        notificationStore.showDialogSuccess('Berhasil', `User STO berhasil ${label}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan user STO';
        notificationStore.showDialogError('Gagal Menyimpan', errorMessage);
      } finally {
        this.isSaving = false;
      }
    },

    /**
     * Hapus user. Panggilan pertama tanpa `force`; kalau backend membalas
     * "confirm", jejaknya ditampilkan dulu dan penghapusan baru dijalankan
     * setelah admin menegaskan.
     */
    async submitDelete(force = false): Promise<void> {
      const notificationStore = useNotificationStore();
      const target = this.deleteTarget;

      if (!target || target.id === null) {
        notificationStore.showAlertWarning('Tidak ada user yang dipilih untuk dihapus.');
        return;
      }

      try {
        this.isDeleting = true;
        const service = useStoManageUserService();
        const result = await service.deleteUser(this.adminNik, target.id, force);

        if (result.status === 'confirm') {
          this.deleteJejak = result.jejak ?? null;
          this.needForce = true;
          return;
        }

        await this.fetchAll();

        this.dialog.delete = false;
        this.resetDelete();

        notificationStore.showDialogSuccess('Berhasil', result.message || 'User STO berhasil dihapus');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus user STO';
        notificationStore.showDialogError('Gagal Menghapus', errorMessage);
      } finally {
        this.isDeleting = false;
      }
    },

    loadForm(action: 'Create' | 'Edit', data?: StoUserRow): void {
      this.action = action;

      if (action === 'Edit' && data) {
        this.editId = data.id;
        this.formData = {
          nik: data.nik ?? '',
          role: data.role ?? '',
          tim: data.tim === 'A' || data.tim === 'B' ? data.tim : '',
          device_id: data.device_id ?? null,
          permissions: [...(data.permissions ?? [])],
          area: [...(data.area ?? [])]
        };
      } else {
        this.resetForm();
      }

      this.dialog.form = true;
    },

    confirmDelete(item: StoUserRow): void {
      this.deleteTarget = item;
      this.deleteJejak = null;
      this.needForce = false;
      this.dialog.delete = true;
    },

    /**
     * Tombol Logout pada "Diakses sebagai". Ganti identitas sekarang lewat
     * dropdown pilih-NIK pada modal PIN (dipicu ulang di sini), bukan lewat
     * halaman -- lihat catatan di StoPinModal.vue.
     */
    async keluarSto(): Promise<void> {
      if (this.isLoggingOut) return;

      try {
        this.isLoggingOut = true;
        await keluarDariStoSesi(this.adminNik);
      } finally {
        this.isLoggingOut = false;
      }

      this.adminNik = readStoAdminNik();
      await this.fetchAll();
    },

    resetForm(): void {
      this.formData = emptyForm();
      this.editId = null;
      this.action = 'Create';
    },

    resetDelete(): void {
      this.deleteTarget = null;
      this.deleteJejak = null;
      this.needForce = false;
    }
  }
});
