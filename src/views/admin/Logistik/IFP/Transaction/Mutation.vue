<template>
  <div 
    class="p-5 max-w-full mx-auto space-y-4 min-h-screen"
    style="
      background:
        radial-gradient(circle at top right,#dbeafe 0%,transparent 25%),
        radial-gradient(circle at bottom left,#ede9fe 0%,transparent 25%),
        #f8fafc;
    "
  >
    <Teleport to="body">
      <Transition name="dialog-fade">
        <div
          v-if="dialogState.visible"
          class="dialog-overlay"
          @click.self="closeDialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="dlg-title"
          aria-describedby="dlg-body"
        >
          <div class="dialog-box" :class="dialogState.wide ? 'dialog-box-wide' : ''">
            <div class="dialog-header">
              <div :class="['dialog-icon', dialogIconClass]">
                <component :is="dialogIconComponent" class="w-5 h-5" />
              </div>
              <p id="dlg-title" class="dialog-title">{{ dialogState.title }}</p>
            </div>
            <div id="dlg-body" class="dialog-body">
              <p class="mb-3 text-gray-500 text-xs">{{ dialogState.message }}</p>
              <template v-if="dialogState.type === 'confirm' && dialogState.previewItems && dialogState.previewItems.length > 0">
                <div class="preview-table-wrap">
                  <table class="preview-table">
                    <thead>
                      <tr>
                        <th class="text-center">#</th>
                        <th>SO Num</th>
                        <th>Job Number</th>
                        <th>Part Number</th>
                        <th>DN</th>
                        <th>Cycle Delv</th>
                        <th class="text-right">Qty Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, idx) in dialogState.previewItems" :key="item.id">
                        <td class="text-center text-gray-400 font-mono">{{ idx + 1 }}</td>
                        <td class="font-mono">{{ item.vbelv || '-' }}</td>
                        <td class="font-medium">{{ item.bismt || '-' }}</td>
                        <td class="font-mono">{{ item.matnr }}</td>
                        <td class="font-mono text-blue-600">{{ item.vbeln }}</td>
                        <td class="font-mono text-center font-bold text-amber-700">{{ item.vsnmr_v }}</td>
                        <td class="text-right font-bold text-red-500 font-mono">{{ item.qty_out }}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="6" class="text-right font-bold text-gray-700">Total Qty Out:</td>
                        <td class="text-right font-bold text-red-600 font-mono">
                          {{ dialogState.previewItems.reduce((s: number, i: any) => s + (Number(i.qty_out) || 0), 0).toLocaleString() }}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p class="mt-2 text-[11px] text-indigo-600 font-medium">
                  {{ dialogState.previewItems.length }} baris akan disinkronkan ke stock movement.
                </p>
              </template>
            </div>
            <div class="dialog-footer">
              <button v-if="dialogState.type === 'confirm'" @click="closeDialog" class="dialog-btn dialog-btn-ghost">Batal</button>
              <button @click="confirmDialog" :class="['dialog-btn', dialogConfirmBtnClass]">
                {{ dialogState.type === 'confirm' ? (dialogState.confirmLabel || 'Ya, Lanjutkan') : 'OK, Mengerti' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <div class="flex justify-between items-start flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
          Mutasi Stok IFP
        </h1>
        <p class="text-xs text-gray-500 mt-0.5">Monitoring</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <span class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700">
          <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>Live
        </span>
        <template v-if="!isEditMode">
          <!-- 1. Sync Stok Awal -->
          <button 
            @click="handleSyncStockAwal" 
            :disabled="isSyncingStockAwal || store.isLoading || isSyncStokAwalDisabledTime"
            :title="isSyncStokAwalDisabledTime ? 'Sync Stok Awal dinonaktifkan antara pukul 06.00 hingga 09.00 pagi' : ''"
            class="btn btn-teal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5" :class="isSyncingStockAwal ? 'animate-spin' : ''"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            {{ isSyncingStockAwal ? 'Menyinkronkan…' : 'Sync Stok Awal' }}
          </button>

          <!-- 2. Qty In -->
          <button 
            @click="handleSyncStockMovement" 
            :disabled="isSyncingStock || store.isLoading"
            class="btn btn-teal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5" :class="isSyncingStock ? 'animate-spin' : ''"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            {{ isSyncingStock ? 'Menyinkronkan…' : 'Qty In' }}
          </button>

          <!-- 3. Sync QTY Out -->
          <button @click="openSoDoModal" class="btn btn-purple">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            Sync QTY Out
          </button>

          <!-- 4. Upload Excel MGL -->
          <button @click="openUploadExcelModal" class="btn btn-green !bg-green-600 !text-white hover:!bg-green-700 !border-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
            Upload Excel MGL
          </button>

          <!-- 5. Export QTY In -->
          <button @click="openExportQtyInModal" class="btn btn-emerald hover:!bg-emerald-700 transition-colors !bg-emerald-600 !text-white !border-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Export QTY In
          </button>

          <!-- 6. Export Excel -->
          <button :disabled="true" @click="exportFilteredToExcel" class="btn btn-emerald hover:!bg-emerald-700 transition-colors !bg-emerald-600 !text-white !border-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Export Excel
          </button>

          <!-- 7. Export Excel Mutasi (Dikomment / Disembunyikan)
          <button :disabled="true" @click="openExportModal" class="btn btn-blue hover:!bg-blue-700 transition-colors !bg-blue-600 !text-white !border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Export Excel Mutasi
          </button>
          -->

          <!-- 8. Edit Data -->
          <button @click="enableEditMode" class="btn btn-amber">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>
            Edit Data
          </button>

          <!-- 9. Save Mutation -->
          <button 
            @click="handleSaveBulk" 
            :disabled="isSaving || (filteredList.length === 0 && store.mutations.length === 0)" 
            class="btn btn-green hover:!bg-green-700 transition-colors !bg-green-600 !text-white !border-green-600 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5" :class="isSaving ? 'animate-spin' : ''"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            {{ isSaving ? 'Menyimpan…' : 'Save Mutation' }}
          </button>

          <!-- 10. Refresh Data -->
          <button 
            @click="resetMainFilters(); handleFetch()" 
            :disabled="store.isLoading" 
            class="btn btn-blue hover:!bg-blue-700 transition-colors !bg-blue-600 !text-white !border-blue-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5" :class="store.isLoading ? 'animate-spin' : ''"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            {{ store.isLoading ? 'Memuat…' : 'Refresh Data' }}
          </button>
        </template>
        <template v-else>
          <button @click="toggleAutoFillTabungan" :class="['btn', isAutoFillTabungan ? 'btn-purple-active' : 'btn-purple']">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813ZM18.279 5.244 18 7.5l-.279-2.256L15.5 5l2.221-.244L18 2.5l.279 2.256L20.5 5l-2.221.244ZM11.465 4.77 11.25 6l-.215-1.23L9.8 4.5l1.235-.215L11.25 3l.215 1.285L12.7 4.5l-1.235.27Z" /></svg>
            Auto Fill Tabungan: {{ isAutoFillTabungan ? 'on' : 'off' }}
            <span class="toggle-switch" :class="isAutoFillTabungan ? 'on' : ''"></span>
          </button>
          <button @click="toggleAutoFillPcs" :class="['btn', isAutoFillPcs ? 'btn-purple-active' : 'btn-purple']">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813ZM18.279 5.244 18 7.5l-.279-2.256L15.5 5l2.221-.244L18 2.5l.279 2.256L20.5 5l-2.221.244ZM11.465 4.77 11.25 6l-.215-1.23L9.8 4.5l1.235-.215L11.25 3l.215 1.285L12.7 4.5l-1.235.27Z" /></svg>
            Auto Fill Pcs/Day Adj: {{ isAutoFillPcs ? 'on' : 'off' }}
            <span class="toggle-switch" :class="isAutoFillPcs ? 'on' : ''"></span>
          </button>
          <button @click="toggleAutoFillMgl" :class="['btn', isAutoFillMgl ? 'btn-purple-active' : 'btn-purple']">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813ZM18.279 5.244 18 7.5l-.279-2.256L15.5 5l2.221-.244L18 2.5l.279 2.256L20.5 5l-2.221.244ZM11.465 4.77 11.25 6l-.215-1.23L9.8 4.5l1.235-.215L11.25 3l.215 1.285L12.7 4.5l-1.235.27Z" /></svg>
            Auto Fill MGL: {{ isAutoFillMgl ? 'on' : 'off' }}
            <span class="toggle-switch" :class="isAutoFillMgl ? 'on' : ''"></span>
          </button>
          <button @click="toggleAutoFillWeld" :class="['btn', isAutoFillWeld ? 'btn-purple-active' : 'btn-purple']">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813ZM18.279 5.244 18 7.5l-.279-2.256L15.5 5l2.221-.244L18 2.5l.279 2.256L20.5 5l-2.221.244ZM11.465 4.77 11.25 6l-.215-1.23L9.8 4.5l1.235-.215L11.25 3l.215 1.285L12.7 4.5l-1.235.27Z" /></svg>
            Auto Fill Weld: {{ isAutoFillWeld ? 'on' : 'off' }}
            <span class="toggle-switch" :class="isAutoFillWeld ? 'on' : ''"></span>
          </button>
          <button @click="toggleManualAdjustmentMode" :class="['btn', isManualAdjustmentMode ? 'btn-purple-active' : 'btn-purple']">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
            Adjust Manual: {{ isManualAdjustmentMode ? 'on' : 'off' }}
            <span class="toggle-switch" :class="isManualAdjustmentMode ? 'on' : ''"></span>
          </button>
          <button @click="cancelEditMode" class="btn btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            Batal
          </button>
          <button 
            @click="handleSaveBulk" 
            :disabled="isSaving" 
            class="btn btn-green hover:!bg-green-700 transition-colors !bg-green-600 !text-white !border-green-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5" :class="isSaving ? 'animate-spin' : ''"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            {{ isSaving ? 'Menyimpan…' : 'Simpan perubahan' }}
          </button>
        </template>
      </div>
    </div>

    <!-- FILTER BAR -->
    <div class="card p-4 bg-white flex items-center gap-4 flex-wrap">
      <div class="flex items-center gap-2">
        <label class="text-xs font-semibold text-gray-600">Tanggal:</label>
        <input type="date" v-model="store.filters.tanggal" class="border rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs font-semibold text-gray-600">Shift:</label>
        <select v-model="store.filters.shift" class="border rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white min-w-[180px]">
          <option value="1">Shift 1</option>
          <option value="2">Shift 2 (All day)</option>
        </select>
      </div>
      <button 
        @click="handleFetch" 
        :disabled="store.isLoading" 
        class="btn btn-blue hover:!bg-blue-700 transition-colors !bg-blue-600 !text-white !border-blue-600 text-xs py-1.5 px-4 shadow-sm"
      >
        <span v-if="store.isLoading" class="flex items-center gap-1.5">
          <svg class="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Loading...
        </span>
        <span v-else>Filter Data</span>
      </button>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      <div class="stat-card"><div class="stat-label">Total baris terproses</div><div class="stat-value text-gray-800">{{ filteredList.length }}</div></div>
      <div class="stat-card"><div class="stat-label text-green-600">✓ Safe (Master)</div><div class="stat-value text-green-700">{{ countByStatus('status', 'SAFE') }}</div></div>
      <div class="stat-card"><div class="stat-label text-red-500">⚠ Kritis (Master)</div><div class="stat-value text-red-600">{{ countByStatus('status', 'KRITIS') }}</div></div>
      <div class="stat-card"><div class="stat-label text-amber-600">↑ Over (Master)</div><div class="stat-value text-amber-700">{{ countByStatus('status', 'OVER') }}</div></div>
    </div>

    <div class="card p-0" @click="closeMainDropdowns">
      <div class="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 flex-wrap gap-2">
        <div class="flex items-center gap-3 flex-wrap">
          <span class="text-xs text-gray-500 flex items-center gap-1.5">
            Menampilkan <strong class="text-gray-700">{{ filteredList.length }}</strong> dari <strong class="text-gray-700">{{ editableList.length }}</strong> baris
          </span>
          <span v-if="isMainAnyFilterActive" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">Filter Aktif</span>
          <span v-if="store.filters.tanggal" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {{ store.filters.tanggal }}
          </span>
          <span v-if="mainSortField" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
            Sort: {{ mainSortField }} {{ mainSortOrder === 'asc' ? '↑' : '↓' }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button @click="resetMainFilters" class="btn btn-ghost py-1 px-2 text-[11px]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
            Clear Filter
          </button>
        </div>
      </div>

      <div class="overflow-x-auto overflow-y-auto" style="min-height: 400px; max-height: 75vh;">
        <table class="text-left border-collapse text-xs whitespace-nowrap table-excel" style="width: max-content; min-width: 100%;">
          <thead class="sticky top-0 z-30">
            <tr class="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold select-none">
              <th class="px-3 py-2 text-center text-gray-400 bg-gray-50 sticky-col-0" style="min-width:44px; max-width:44px;">#</th>
              
              <!-- Part Number & Name -->
              <th class="px-3 py-2 bg-gray-50 relative sticky-col-1" style="min-width:220px;" @click.stop>
                <div class="flex items-center gap-1">
                  <span>Part Number &amp; Name</span>
                  <button @click.stop="setMainSort('part_number')" :class="['sort-btn', mainSortField === 'part_number' ? (mainSortOrder === 'asc' ? 'sort-btn-asc' : 'sort-btn-desc') : '']">
                    <svg v-if="mainSortField !== 'part_number'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('part_number')" :class="['excel-filter-btn', mainColFilters.part_number.length ? 'excel-filter-btn-active' : '']">▼</button>
                </div>
                <div v-if="mainActiveDropdown === 'part_number'" class="excel-dropdown" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('part_number', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort A to Z (Terkecil ke Terbesar)</span>
                    </button>
                    <button @click.stop="setMainSort('part_number', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Z to A (Terbesar ke Terkecil)</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="part_number" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.part_number" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('part_number')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('part_number')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('part_number')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.part_number" @click.stop="addSearchMain('part_number')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('part_number')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.part_number" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('part_number', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>
 
               <!-- COMMON PART -->
              <th class="px-3 py-2 text-center bg-gray-50 relative" style="min-width:130px;" @click.stop>
                <div class="flex items-center justify-center gap-1">
                  <span>COMMON PART</span>
                  <button @click.stop="setMainSort('common_part')" :class="['sort-btn', mainSortField === 'common_part' ? (mainSortOrder === 'asc' ? 'sort-btn-asc' : 'sort-btn-desc') : '']">
                    <svg v-if="mainSortField !== 'common_part'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('common_part')" :class="['excel-filter-btn', mainColFilters.common_part?.length ? 'excel-filter-btn-active' : '']">▼</button>
                </div>
                <div v-if="mainActiveDropdown === 'common_part'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('common_part', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort A to Z (Terkecil ke Terbesar)</span>
                    </button>
                    <button @click.stop="setMainSort('common_part', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Z to A (Terbesar ke Terkecil)</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="common_part" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.common_part" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('common_part')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('common_part')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('common_part')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.common_part" @click.stop="addSearchMain('common_part')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('common_part')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.common_part" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('common_part', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>
 
               <!-- Route -->
              <th class="px-3 py-2 bg-gray-50 relative sticky-col-2" style="min-width:120px; max-width:120px; width:120px;" @click.stop>
                <div class="flex items-center gap-1">
                  <span>Route</span>
                  <button @click.stop="setMainSort('zrouting')" :class="['sort-btn', mainSortField === 'zrouting' ? (mainSortOrder === 'asc' ? 'sort-btn-asc' : 'sort-btn-desc') : '']">
                    <svg v-if="mainSortField !== 'zrouting'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('zrouting')" :class="['excel-filter-btn', mainColFilters.zrouting.length ? 'excel-filter-btn-active' : '']">▼</button>
                </div>
                <div v-if="mainActiveDropdown === 'zrouting'" class="excel-dropdown" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('zrouting', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort A to Z (Terkecil ke Terbesar)</span>
                    </button>
                    <button @click.stop="setMainSort('zrouting', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Z to A (Terbesar ke Terkecil)</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="zrouting" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.zrouting" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('zrouting')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('zrouting')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('zrouting')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.zrouting" @click.stop="addSearchMain('zrouting')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('zrouting')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.zrouting" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('zrouting', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>
 
               <!-- Job Number -->
              <th class="px-3 py-2 bg-gray-50 relative sticky-col-3" style="min-width:120px; max-width:120px; width:120px;" @click.stop>
                <div class="flex items-center gap-1">
                  <span>Job Number</span>
                  <button @click.stop="setMainSort('job_number')" :class="['sort-btn', mainSortField === 'job_number' ? (mainSortOrder === 'asc' ? 'sort-btn-asc' : 'sort-btn-desc') : '']">
                    <svg v-if="mainSortField !== 'job_number'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('job_number')" :class="['excel-filter-btn', mainColFilters.job_number.length ? 'excel-filter-btn-active' : '']">▼</button>
                </div>
                <div v-if="mainActiveDropdown === 'job_number'" class="excel-dropdown" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('job_number', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort A to Z (Terkecil ke Terbesar)</span>
                    </button>
                    <button @click.stop="setMainSort('job_number', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Z to A (Terbesar ke Terkecil)</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="job_number" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.job_number" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('job_number')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('job_number')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('job_number')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.job_number" @click.stop="addSearchMain('job_number')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('job_number')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.job_number" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('job_number', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>
 
               <!-- Model -->
              <th class="px-3 py-2 bg-gray-50 relative" style="min-width:100px;" @click.stop>
                <div class="flex items-center gap-1">
                  <span>Model</span>
                  <button @click.stop="setMainSort('project_id')" :class="['sort-btn', mainSortField === 'project_id' ? (mainSortOrder === 'asc' ? 'sort-btn-asc' : 'sort-btn-desc') : '']">
                    <svg v-if="mainSortField !== 'project_id'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('project_id')" :class="['excel-filter-btn', mainColFilters.project_id.length ? 'excel-filter-btn-active' : '']">▼</button>
                </div>
                <div v-if="mainActiveDropdown === 'project_id'" class="excel-dropdown" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('project_id', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort A to Z (Terkecil ke Terbesar)</span>
                    </button>
                    <button @click.stop="setMainSort('project_id', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Z to A (Terbesar ke Terkecil)</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="project_id" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.project_id" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('project_id')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('project_id')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('project_id')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.project_id" @click.stop="addSearchMain('project_id')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('project_id')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.project_id" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('project_id', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>
 
               <!-- Customer -->
              <th class="px-3 py-2 bg-gray-50 relative" style="min-width:110px;" @click.stop>
                <div class="flex items-center gap-1">
                  <span>Customer</span>
                  <button @click.stop="setMainSort('DEST1')" :class="['sort-btn', mainSortField === 'DEST1' ? (mainSortOrder === 'asc' ? 'sort-btn-asc' : 'sort-btn-desc') : '']">
                    <svg v-if="mainSortField !== 'DEST1'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('DEST1')" :class="['excel-filter-btn', mainColFilters.DEST1.length ? 'excel-filter-btn-active' : '']">▼</button>
                </div>
                <div v-if="mainActiveDropdown === 'DEST1'" class="excel-dropdown" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('DEST1', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort A to Z (Terkecil ke Terbesar)</span>
                    </button>
                    <button @click.stop="setMainSort('DEST1', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Z to A (Terbesar ke Terkecil)</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="DEST1" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.DEST1" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('DEST1')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('DEST1')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('DEST1')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.DEST1" @click.stop="addSearchMain('DEST1')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('DEST1')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.DEST1" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('DEST1', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Qty Kanban -->
              <th class="px-3 py-2 text-right bg-gray-50 relative" style="min-width:110px;" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <span>Qty/Kbn</span>
                  <button @click.stop="setMainSort('qty_kbn')" :class="['sort-btn', mainSortField==='qty_kbn'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                    <svg v-if="mainSortField !== 'qty_kbn'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('qty_kbn')" :class="['excel-filter-btn', mainColFilters.qty_kbn.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='qty_kbn'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('qty_kbn', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('qty_kbn', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="qty_kbn" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.qty_kbn" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('qty_kbn')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('qty_kbn')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('qty_kbn')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.qty_kbn" @click.stop="addSearchMain('qty_kbn')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('qty_kbn')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.qty_kbn" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('qty_kbn', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Pcs/Day -->
              <th class="px-3 py-2 text-right bg-gray-50 relative" style="min-width:120px;" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <span>Pcs/Day</span>
                  <button @click.stop="setMainSort('pcs_day_mdfo')" :class="['sort-btn', mainSortField==='pcs_day_mdfo'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                    <svg v-if="mainSortField !== 'pcs_day_mdfo'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('pcs_day_mdfo')" :class="['excel-filter-btn', mainColFilters.pcs_day_mdfo.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='pcs_day_mdfo'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('pcs_day_mdfo', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('pcs_day_mdfo', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="pcs_day_mdfo" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.pcs_day_mdfo" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('pcs_day_mdfo')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('pcs_day_mdfo')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('pcs_day_mdfo')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.pcs_day_mdfo" @click.stop="addSearchMain('pcs_day_mdfo')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('pcs_day_mdfo')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.pcs_day_mdfo" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('pcs_day_mdfo', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>
 
                <!-- PCS TODAY -->
              <th class="px-3 py-2 text-right text-indigo-700 bg-gray-50 relative" style="min-width:120px;" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <span>PCS TODAY</span>
                  <button @click.stop="setMainSort('pcs_today')" :class="['sort-btn', mainSortField==='pcs_today'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                    <svg v-if="mainSortField !== 'pcs_today'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('pcs_today')" :class="['excel-filter-btn', mainColFilters.pcs_today.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='pcs_today'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('pcs_today', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('pcs_today', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="pcs_today" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.pcs_today" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('pcs_today')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('pcs_today')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('pcs_today')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.pcs_today" @click.stop="addSearchMain('pcs_today')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('pcs_today')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.pcs_today" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('pcs_today', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>

               <!-- PCS DELV H+1 (pcs_tomorrow) -->
              <th class="px-3 py-2 text-right text-indigo-700 bg-gray-50 relative" style="min-width:130px;" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <span>PCS DELV H+1</span>
                  <button @click.stop="setMainSort('pcs_tomorrow')" :class="['sort-btn', mainSortField==='pcs_tomorrow'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                    <svg v-if="mainSortField !== 'pcs_tomorrow'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('pcs_tomorrow')" :class="['excel-filter-btn', mainColFilters.pcs_tomorrow.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='pcs_tomorrow'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('pcs_tomorrow', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('pcs_tomorrow', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="pcs_tomorrow" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.pcs_tomorrow" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('pcs_tomorrow')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('pcs_tomorrow')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('pcs_tomorrow')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.pcs_tomorrow" @click.stop="addSearchMain('pcs_tomorrow')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('pcs_tomorrow')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.pcs_tomorrow" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('pcs_tomorrow', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>
 
               <!-- Pcs/Day Adj -->
               <th class="px-3 py-2 text-right bg-amber-50/60 relative" style="min-width:140px;" @click.stop>
                 <div class="flex items-center justify-end gap-1">
                   <span>Pcs/Day Adj</span>
                   <button @click.stop="setMainSort('pcs_day_adjust')" :class="['sort-btn', mainSortField==='pcs_day_adjust'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                     <svg v-if="mainSortField !== 'pcs_day_adjust'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                     <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                     <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                   </button>
                   <button @click.stop="toggleMainDropdown('pcs_day_adjust')" :class="['excel-filter-btn', mainColFilters.pcs_day_adjust.length?'excel-filter-btn-active':'']">▼</button>
                 </div>
                 <div v-if="mainActiveDropdown==='pcs_day_adjust'" class="excel-dropdown excel-dropdown-right" @click.stop>
                   <div class="excel-dropdown-sort-section">
                     <button @click.stop="setMainSort('pcs_day_adjust', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                       <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                       <span>Sort Terkecil ke Terbesar</span>
                     </button>
                     <button @click.stop="setMainSort('pcs_day_adjust', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                       <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                       <span>Sort Terbesar ke Terkecil</span>
                     </button>
                   </div>
                   <div class="border-t border-gray-100"></div>
                   <ColorFilter colKey="pcs_day_adjust" />
                   <div class="excel-dropdown-search"><input v-model="mainColSearch.pcs_day_adjust" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                   <div class="excel-selection-actions flex gap-2 justify-between">
                     <button @click.stop="selectAllMain('pcs_day_adjust')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                     <button @click.stop="clearMain('pcs_day_adjust')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                     <button @click.stop="invertMainColSelection('pcs_day_adjust')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                   
                     <button v-if="mainColSearch.pcs_day_adjust" @click.stop="addSearchMain('pcs_day_adjust')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                   </div>
                   <div class="excel-options-list">
                     <div v-for="opt in getMainColOptions('pcs_day_adjust')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                       <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                         <input type="checkbox" :value="opt" v-model="mainColFilters.pcs_day_adjust" />
                         <span>{{ opt }}</span>
                       </label>
                       <button
                         class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                         @click.stop="selectMainOnly('pcs_day_adjust', opt)"
                       >
                         Only
                       </button>
                     </div>
                   </div>
                 </div>
               </th>
 
               <!-- STOK ADJ -->
              <th class="px-3 py-2 text-right text-purple-700 bg-gray-50 relative" style="min-width:110px;" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <span>STOK ADJ</span>
                  <button @click.stop="setMainSort('stok_awal_tabungan')" :class="['sort-btn', mainSortField==='stok_awal_tabungan'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                    <svg v-if="mainSortField !== 'stok_awal_tabungan'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('stok_awal_tabungan')" :class="['excel-filter-btn', mainColFilters.stok_awal_tabungan.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='stok_awal_tabungan'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('stok_awal_tabungan', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('stok_awal_tabungan', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="stok_awal_tabungan" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.stok_awal_tabungan" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('stok_awal_tabungan')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('stok_awal_tabungan')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('stok_awal_tabungan')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.stok_awal_tabungan" @click.stop="addSearchMain('stok_awal_tabungan')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('stok_awal_tabungan')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.stok_awal_tabungan" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('stok_awal_tabungan', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>
 
               <!-- Tabungan -->
              <th class="px-3 py-2 text-right text-emerald-600 bg-gray-50 relative" style="min-width:100px;" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <span>Tab</span>
                  <button @click.stop="setMainSort('tabungan')" :class="['sort-btn', mainSortField==='tabungan'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                    <svg v-if="mainSortField !== 'tabungan'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('tabungan')" :class="['excel-filter-btn', mainColFilters.tabungan.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='tabungan'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('tabungan', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('tabungan', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="tabungan" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.tabungan" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('tabungan')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('tabungan')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('tabungan')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.tabungan" @click.stop="addSearchMain('tabungan')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('tabungan')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.tabungan" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('tabungan', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>
 
               <!-- Stok Awal -->
              <th class="px-3 py-2 text-right text-teal-600 bg-gray-50 relative" style="min-width:90px;" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <span>Stok Awal</span>
                  <button @click.stop="setMainSort('stok_awal')" :class="['sort-btn', mainSortField==='stok_awal'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                    <svg v-if="mainSortField !== 'stok_awal'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('stok_awal')" :class="['excel-filter-btn', mainColFilters.stok_awal.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='stok_awal'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('stok_awal', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('stok_awal', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="stok_awal" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.stok_awal" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('stok_awal')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('stok_awal')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('stok_awal')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.stok_awal" @click.stop="addSearchMain('stok_awal')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('stok_awal')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.stok_awal" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('stok_awal', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Stok Monitoring Weld -->
              <th class="px-3 py-2 text-right text-emerald-700 bg-gray-50 relative" style="min-width:140px;" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <span>Stok Weld</span>
                  <button @click.stop="setMainSort('stock_weld_yesterday')" :class="['sort-btn', mainSortField==='stock_weld_yesterday'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                    <svg v-if="mainSortField !== 'stock_weld_yesterday'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('stock_weld_yesterday')" :class="['excel-filter-btn', mainColFilters.stock_weld_yesterday?.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='stock_weld_yesterday'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('stock_weld_yesterday', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('stock_weld_yesterday', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="stock_weld_yesterday" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.stock_weld_yesterday" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('stock_weld_yesterday')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('stock_weld_yesterday')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('stock_weld_yesterday')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.stock_weld_yesterday" @click.stop="addSearchMain('stock_weld_yesterday')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('stock_weld_yesterday')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.stock_weld_yesterday" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('stock_weld_yesterday', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>



              <!-- Qty In -->
              <th class="px-3 py-2 text-right text-green-600 bg-gray-50 relative" style="min-width:80px;" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <span>Qty In</span>
                  <button @click.stop="setMainSort('qty_in')" :class="['sort-btn', mainSortField==='qty_in'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                    <svg v-if="mainSortField !== 'qty_in'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('qty_in')" :class="['excel-filter-btn', mainColFilters.qty_in.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='qty_in'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('qty_in', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('qty_in', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="qty_in" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.qty_in" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('qty_in')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('qty_in')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('qty_in')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.qty_in" @click.stop="addSearchMain('qty_in')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('qty_in')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.qty_in" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('qty_in', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Qty Out -->
              <th class="px-3 py-2 text-right text-red-500 bg-gray-50 relative" style="min-width:80px;" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <span>Qty Out</span>
                  <button @click.stop="setMainSort('qty_out')" :class="['sort-btn', mainSortField==='qty_out'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                    <svg v-if="mainSortField !== 'qty_out'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('qty_out')" :class="['excel-filter-btn', mainColFilters.qty_out.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='qty_out'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('qty_out', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('qty_out', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="qty_out" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.qty_out" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('qty_out')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('qty_out')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('qty_out')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.qty_out" @click.stop="addSearchMain('qty_out')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('qty_out')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.qty_out" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('qty_out', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Qty System -->
              <th class="px-3 py-2 text-right text-blue-600 bg-gray-50 relative" style="min-width:100px;" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <span>Qty System</span>
                  <button @click.stop="setMainSort('qty_calc_system')" :class="['sort-btn', mainSortField==='qty_calc_system'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                    <svg v-if="mainSortField !== 'qty_calc_system'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('qty_calc_system')" :class="['excel-filter-btn', mainColFilters.qty_calc_system.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='qty_calc_system'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('qty_calc_system', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('qty_calc_system', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="qty_calc_system" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.qty_calc_system" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('qty_calc_system')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('qty_calc_system')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('qty_calc_system')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.qty_calc_system" @click.stop="addSearchMain('qty_calc_system')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('qty_calc_system')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.qty_calc_system" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('qty_calc_system', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>



              <!-- Stok Akhir -->
              <th class="px-3 py-2 text-right text-indigo-600 bg-gray-50 relative" style="min-width:90px;" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <span>Stok Akhir</span>
                  <button @click.stop="setMainSort('stok_akhir')" :class="['sort-btn', mainSortField==='stok_akhir'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                    <svg v-if="mainSortField !== 'stok_akhir'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('stok_akhir')" :class="['excel-filter-btn', mainColFilters.stok_akhir.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='stok_akhir'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('stok_akhir', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('stok_akhir', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="stok_akhir" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.stok_akhir" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('stok_akhir')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('stok_akhir')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('stok_akhir')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.stok_akhir" @click.stop="addSearchMain('stok_akhir')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('stok_akhir')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.stok_akhir" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('stok_akhir', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Stok MGL -->
              <th class="px-3 py-2 text-right text-teal-700 bg-gray-50 relative" style="min-width:140px;" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <span>Stok MGL</span>
                  <button @click.stop="setMainSort('stock_mgl')" :class="['sort-btn', mainSortField==='stock_mgl'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                    <svg v-if="mainSortField !== 'stock_mgl'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click.stop="toggleMainDropdown('stock_mgl')" :class="['excel-filter-btn', mainColFilters.stock_mgl?.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='stock_mgl'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('stock_mgl', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('stock_mgl', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="stock_mgl" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.stock_mgl" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('stock_mgl')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('stock_mgl')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('stock_mgl')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.stock_mgl" @click.stop="addSearchMain('stock_mgl')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('stock_mgl')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.stock_mgl" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('stock_mgl', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Safe Hour Min & Max -->
              <!-- Min -->
              <th class="px-2 py-2 text-center bg-gray-50 text-gray-700 font-semibold relative" style="min-width:65px;" @click.stop>
                <div class="flex items-center justify-center gap-1">
                  <span>Min</span>
                  <button @click.stop="toggleMainDropdown('std_min')" :class="['excel-filter-btn', mainColFilters.std_min?.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='std_min'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('std_min', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('std_min', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="std_min" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.std_min" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('std_min')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('std_min')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('std_min')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.std_min" @click.stop="addSearchMain('std_min')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('std_min')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.std_min" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('std_min', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Max -->
              <th class="px-2 py-2 text-center bg-gray-50 text-gray-700 font-semibold relative" style="min-width:65px;" @click.stop>
                <div class="flex items-center justify-center gap-1">
                  <span>Max</span>
                  <button @click.stop="toggleMainDropdown('std_max')" :class="['excel-filter-btn', mainColFilters.std_max?.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='std_max'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('std_max', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort Terkecil ke Terbesar</span>
                    </button>
                    <button @click.stop="setMainSort('std_max', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Terbesar ke Terkecil</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="std_max" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.std_max" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('std_max')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('std_max')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('std_max')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.std_max" @click.stop="addSearchMain('std_max')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('std_max')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.std_max" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('std_max', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>
              <th class="px-3 py-2 text-right text-purple-600 bg-gray-50 relative" style="min-width:130px;" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <span>Strength</span>
                  <button @click.stop="setMainSort('strength_system')" :class="['sort-btn', mainSortField==='strength_system'?(mainSortOrder==='asc'?'sort-btn-asc':'sort-btn-desc'):'']">
                    <svg v-if="mainSortField !== 'strength_system'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
                    <svg v-else-if="mainSortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                </div>
              </th>
              
              <!-- Status System -->
              <th class="px-3 py-2 text-center bg-blue-50/40 text-blue-800 relative" style="min-width:110px;" @click.stop>
                <div class="flex items-center justify-center gap-1">
                  <span>Status</span>
                  <button @click.stop="toggleMainDropdown('status_sys')" :class="['excel-filter-btn', mainColFilters.status_sys.length?'excel-filter-btn-active':'']">▼</button>
                </div>
                <div v-if="mainActiveDropdown==='status_sys'" class="excel-dropdown excel-dropdown-right" @click.stop>
                  <div class="excel-dropdown-sort-section">
                    <button @click.stop="setMainSort('status_sys', 'asc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span>Sort A to Z (Terkecil ke Terbesar)</span>
                    </button>
                    <button @click.stop="setMainSort('status_sys', 'desc'); closeMainDropdowns()" class="excel-dropdown-sort-item">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                      <span>Sort Z to A (Terbesar ke Terkecil)</span>
                    </button>
                  </div>
                  <div class="border-t border-gray-100"></div>
                  <ColorFilter colKey="status_sys" />
                  <div class="excel-dropdown-search"><input v-model="mainColSearch.status_sys" placeholder="Cari…" class="excel-search-input" @click.stop /></div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllMain('status_sys')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearMain('status_sys')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertMainColSelection('status_sys')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  
                    <button v-if="mainColSearch.status_sys" @click.stop="addSearchMain('status_sys')" class="text-[10px] text-green-600 hover:text-green-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Add Search</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getMainColOptions('status_sys')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="mainColFilters.status_sys" />
                        <span>{{ opt }}</span>
                      </label>
                      <button
                        class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer"
                        @click.stop="selectMainOnly('status_sys', opt)"
                      >
                        Only
                      </button>
                    </div>
                  </div>
                </div>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100 text-xs">
            <tr v-if="store.isLoading">
              <td colspan="24" class="py-20 text-center text-gray-400 bg-white">Memuat data dari server…</td>
            </tr>
            <tr v-else-if="filteredList.length === 0">
              <td colspan="24" class="py-20 text-center text-gray-400 bg-white">
                <div class="flex flex-col items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  <span>Tidak ada data yang cocok dengan filter aktif.</span>
                  <button @click="resetMainFilters" class="mt-1 text-blue-600 underline text-xs">Hapus semua filter</button>
                </div>
              </td>
            </tr>
            <tr v-else v-for="(item, index) in filteredList" :key="item.id" class="hover:bg-blue-50/30 transition-colors">
              <td :style="getCellBgStyle(item, 'index')" @contextmenu.prevent="openContextMenu($event, item, 'index')" @mousedown="handleCellMouseDown($event, item, 'index', index)" @mouseenter="handleCellMouseEnter($event, item, 'index', index)" :class="[isCellSelected(item, 'index') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-center text-gray-400 font-mono text-[10px] select-none sticky-col-0">{{ index + 1 }}</td>
              <td :style="getCellBgStyle(item, 'part_number')" @contextmenu.prevent="openContextMenu($event, item, 'part_number')" @mousedown="handleCellMouseDown($event, item, 'part_number', index)" @mouseenter="handleCellMouseEnter($event, item, 'part_number', index)" :class="[isCellSelected(item, 'part_number') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 sticky-col-1">
                <div class="font-medium text-gray-900">{{ item.part_number }}</div>
                <div class="text-gray-400 max-w-[200px] truncate">{{ item.MAKTX }}</div>
              </td>
              <td :style="getCellBgStyle(item, 'common_part')" @contextmenu.prevent="openContextMenu($event, item, 'common_part')" @mousedown="handleCellMouseDown($event, item, 'common_part', index)" @mouseenter="handleCellMouseEnter($event, item, 'common_part', index)" :class="[isCellSelected(item, 'common_part') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-center">
                <span v-if="item.is_common" class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 select-none">
                  COMMON
                </span>
                <span v-else class="text-gray-400 text-xs">-</span>
              </td>
              <td :style="getCellBgStyle(item, 'zrouting')" @contextmenu.prevent="openContextMenu($event, item, 'zrouting')" @mousedown="handleCellMouseDown($event, item, 'zrouting', index)" @mouseenter="handleCellMouseEnter($event, item, 'zrouting', index)" :class="[isCellSelected(item, 'zrouting') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-gray-700 font-mono sticky-col-2">{{ item.zrouting }}</td>
              <td :style="getCellBgStyle(item, 'job_number')" @contextmenu.prevent="openContextMenu($event, item, 'job_number')" @mousedown="handleCellMouseDown($event, item, 'job_number', index)" @mouseenter="handleCellMouseEnter($event, item, 'job_number', index)" :class="[isCellSelected(item, 'job_number') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-gray-600 font-mono sticky-col-3">{{ item.job_number }}</td>
              <td :style="getCellBgStyle(item, 'project_id')" @contextmenu.prevent="openContextMenu($event, item, 'project_id')" @mousedown="handleCellMouseDown($event, item, 'project_id', index)" @mouseenter="handleCellMouseEnter($event, item, 'project_id', index)" :class="[isCellSelected(item, 'project_id') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 font-mono text-gray-600">{{ item.project_id }}</td>
              <td :style="getCellBgStyle(item, 'DEST1')" @contextmenu.prevent="openContextMenu($event, item, 'DEST1')" @mousedown="handleCellMouseDown($event, item, 'DEST1', index)" @mouseenter="handleCellMouseEnter($event, item, 'DEST1', index)" :class="[isCellSelected(item, 'DEST1') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 font-mono text-gray-600">{{ item.DEST1 }}</td>
              <td :style="getCellBgStyle(item, 'qty_kbn')" @contextmenu.prevent="openContextMenu($event, item, 'qty_kbn')" @mousedown="handleCellMouseDown($event, item, 'qty_kbn', index)" @mouseenter="handleCellMouseEnter($event, item, 'qty_kbn', index)" :class="[isCellSelected(item, 'qty_kbn') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-right font-mono text-gray-700">
                {{ item.qty_kbn ?? 0 }}
              </td>
              <td :style="getCellBgStyle(item, 'pcs_day_mdfo')" @contextmenu.prevent="openContextMenu($event, item, 'pcs_day_mdfo')" @mousedown="handleCellMouseDown($event, item, 'pcs_day_mdfo', index)" @mouseenter="handleCellMouseEnter($event, item, 'pcs_day_mdfo', index)" :class="[isCellSelected(item, 'pcs_day_mdfo') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-right font-mono">{{ item.pcs_day_mdfo_roundedkanban_stocks_table }}</td>
              <td :style="getCellBgStyle(item, 'pcs_today')" @contextmenu.prevent="openContextMenu($event, item, 'pcs_today')" @mousedown="handleCellMouseDown($event, item, 'pcs_today', index)" @mouseenter="handleCellMouseEnter($event, item, 'pcs_today', index)" :class="[isCellSelected(item, 'pcs_today') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-right font-mono text-indigo-600 font-medium">
                {{ item.pcs_today ?? 0 }}
              </td>

              <!-- PCS DELV H+1 (pcs_tomorrow) -->
              <td :style="getCellBgStyle(item, 'pcs_tomorrow')" @contextmenu.prevent="openContextMenu($event, item, 'pcs_tomorrow')" @mousedown="handleCellMouseDown($event, item, 'pcs_tomorrow', index)" @mouseenter="handleCellMouseEnter($event, item, 'pcs_tomorrow', index)" :class="[isCellSelected(item, 'pcs_tomorrow') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-right font-mono text-indigo-600 font-medium">
                {{ item.pcs_tomorrow ?? 0 }}
              </td>

              <!-- Pcs/Day Adj -->
              <td :style="getCellBgStyle(item, 'pcs_day_adjust')" @contextmenu.prevent="openContextMenu($event, item, 'pcs_day_adjust')" @mousedown="handleCellMouseDown($event, item, 'pcs_day_adjust', index)" @mouseenter="handleCellMouseEnter($event, item, 'pcs_day_adjust', index)" :class="[isCellSelected(item, 'pcs_day_adjust') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-right bg-amber-50/30">
                <template v-if="isEditMode">
                  <input type="number" step="0.01" v-model.number="item.pcs_day_adjust" @input="findAndCalculateRow(item, 'pcs_day_adjust')" class="edit-input w-24 text-right mb-1" />
                  
                  <div class="flex flex-col gap-1 mt-1 text-[10px] text-gray-600 font-sans border-t pt-1">
                    <label class="flex items-center justify-between gap-2 cursor-pointer hover:bg-gray-100 px-1 rounded">
                      <span>Pcs/Day: {{ item.pcs_day_mdfo_roundedkanban_stocks_table ?? 0 }}</span>
                      <input 
                        type="radio" 
                        :name="'pcs_radio_'+item.id" 
                        :checked="item.pcs_day_adjust !== null && item.pcs_day_adjust !== undefined && Number(item.pcs_day_adjust) === Number(item.pcs_day_mdfo_roundedkanban_stocks_table)"
                        @change="handleRadioChange(item, 'pcs', item.pcs_day_mdfo_roundedkanban_stocks_table)" 
                        class="accent-blue-600" 
                      />
                    </label>
                    
                    <label class="flex items-center justify-between gap-2 cursor-pointer hover:bg-gray-100 px-1 rounded">
                      <span>Pcs Today: {{ item.pcs_today ?? 0 }}</span>
                      <input 
                        type="radio" 
                        :name="'pcs_radio_'+item.id" 
                        :checked="item.pcs_day_adjust !== null && item.pcs_day_adjust !== undefined && Number(item.pcs_day_adjust) === Number(item.pcs_today)"
                        @change="handleRadioChange(item, 'pcs', item.pcs_today)" 
                        class="accent-indigo-600" 
                      />
                    </label>

                    <button @click="resetValue(item, 'pcs')" class="text-[9px] text-red-500 underline mt-1">Reset ke Awal</button>
                  </div>
                </template>
                <template v-else>
                  <span class="font-bold text-sm">{{ item.pcs_day_adjust ?? '-' }}</span>
                </template>
              </td>
              
              <!-- STOK ADJ (stok_awal_tabungan) -->
              <td :style="getCellBgStyle(item, 'stok_awal_tabungan')" @contextmenu.prevent="openContextMenu($event, item, 'stok_awal_tabungan')" @mousedown="handleCellMouseDown($event, item, 'stok_awal_tabungan', index)" @mouseenter="handleCellMouseEnter($event, item, 'stok_awal_tabungan', index)" :class="[isCellSelected(item, 'stok_awal_tabungan') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-right font-mono text-purple-700 font-medium">
                {{ item.stok_awal_tabungan ?? 0 }}
              </td>

              <!-- Tabungan -->
              <td :style="getCellBgStyle(item, 'tabungan')" @contextmenu.prevent="openContextMenu($event, item, 'tabungan')" @mousedown="handleCellMouseDown($event, item, 'tabungan', index)" @mouseenter="handleCellMouseEnter($event, item, 'tabungan', index)" :class="[isCellSelected(item, 'tabungan') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-right font-mono text-emerald-600 font-medium">
                <template v-if="isEditMode">
                  <input type="number" v-model.number="item.tabungan"
                    @input="findAndCalculateRow(item, 'tabungan')"
                    class="edit-input w-20 text-right"
                    :class="item.tabungan < 0 ? '!text-red-600 !border-red-300 font-bold' : ''" />
                  
                  <div v-if="item.suggest_transfer_type === 'TO_TABUNGAN' && item.suggest_transfer_qty > 0" class="mt-1">
                    <button 
                      @click="applySafeSuggestion(item)"
                      title="Klik untuk memasukkan kelebihan stok ke Tabungan agar status SAFE"
                      class="text-[10px] bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold px-1.5 py-0.5 rounded border border-amber-200 cursor-pointer text-left whitespace-nowrap"
                    >
                      💡 +{{ item.suggest_transfer_qty }} ke Tabungan
                    </button>
                  </div>
                  <div v-else-if="item.suggest_transfer_type === 'TO_STOK_AWAL' && item.suggest_transfer_qty > 0" class="mt-1 text-[10px] text-red-500 font-semibold text-right whitespace-nowrap">
                    (-{{ item.suggest_transfer_qty }})
                  </div>
                </template>
                <span v-else :class="item.tabungan < 0 ? 'text-red-600 font-bold' : ''">{{ item.tabungan ?? 0 }}</span>
              </td>

              <!-- Stok Awal -->
              <td :style="getCellBgStyle(item, 'stok_awal')" @contextmenu.prevent="openContextMenu($event, item, 'stok_awal')" @mousedown="handleCellMouseDown($event, item, 'stok_awal', index)" @mouseenter="handleCellMouseEnter($event, item, 'stok_awal', index)" :class="[isCellSelected(item, 'stok_awal') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-right font-mono text-teal-600 font-medium">
                <template v-if="isEditMode">
                  <input type="number" v-model.number="item.stok_awal"
                    @input="findAndCalculateRow(item, 'stok_awal')"
                    class="edit-input w-20 text-right" />
                  
                  <div v-if="item.suggest_transfer_type === 'TO_STOK_AWAL' && item.suggest_transfer_qty > 0" class="mt-1">
                    <button 
                      @click="applySafeSuggestion(item)"
                      title="Klik untuk menambah stok awal agar status SAFE"
                      class="text-[10px] bg-red-50 text-red-700 hover:bg-red-100 font-semibold px-1.5 py-0.5 rounded border border-red-200 cursor-pointer text-left whitespace-nowrap"
                    >
                      💡 +{{ item.suggest_transfer_qty }} {{ (item.tabungan ?? 0) >= item.suggest_transfer_qty ? 'dr Tabungan' : 'ke Stok Awal' }}
                    </button>
                  </div>
                  <div v-else-if="item.suggest_transfer_type === 'TO_TABUNGAN' && item.suggest_transfer_qty > 0" class="mt-1 text-[10px] text-amber-700 font-semibold text-right whitespace-nowrap">
                    (-{{ item.suggest_transfer_qty }})
                  </div>

                  <button 
                    v-if="item.original_stok_awal !== undefined || item.original_tabungan !== undefined" 
                    @click="resetStokAwalTabungan(item)" 
                    class="text-[9px] text-gray-400 hover:text-red-500 underline mt-0.5 block ml-auto cursor-pointer"
                  >
                    Reset
                  </button>
                </template>
                <span v-else>{{ item.stok_awal }}</span>
              </td>

              <!-- Stok Monitoring Weld -->
              <td :style="getCellBgStyle(item, 'stock_weld_yesterday')" @contextmenu.prevent="openContextMenu($event, item, 'stock_weld_yesterday')" @mousedown="handleCellMouseDown($event, item, 'stock_weld_yesterday', index)" @mouseenter="handleCellMouseEnter($event, item, 'stock_weld_yesterday', index)" :class="[isCellSelected(item, 'stock_weld_yesterday') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-right font-mono text-emerald-600 font-medium">
                {{ item.stock_weld_yesterday ?? 0 }}
              </td>



              <td :style="getCellBgStyle(item, 'qty_in')" @contextmenu.prevent="openContextMenu($event, item, 'qty_in')" @mousedown="handleCellMouseDown($event, item, 'qty_in', index)" @mouseenter="handleCellMouseEnter($event, item, 'qty_in', index)" :class="[isCellSelected(item, 'qty_in') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-right font-mono text-green-600">+{{ item.qty_in }}</td>

              <td :style="getCellBgStyle(item, 'qty_out')" @contextmenu.prevent="openContextMenu($event, item, 'qty_out')" @mousedown="handleCellMouseDown($event, item, 'qty_out', index)" @mouseenter="handleCellMouseEnter($event, item, 'qty_out', index)" :class="[isCellSelected(item, 'qty_out') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-right font-mono text-red-500 font-bold">-{{ item.qty_out }}</td>

              <td :style="getCellBgStyle(item, 'qty_calc_system')" @contextmenu.prevent="openContextMenu($event, item, 'qty_calc_system')" @mousedown="handleCellMouseDown($event, item, 'qty_calc_system', index)" @mouseenter="handleCellMouseEnter($event, item, 'qty_calc_system', index)" :class="[isCellSelected(item, 'qty_calc_system') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-right font-mono font-semibold text-blue-600">
                {{ item.qty_calc_system }}
              </td>

              <!-- Stok Akhir -->
              <td :style="getCellBgStyle(item, 'stok_akhir')" @contextmenu.prevent="openContextMenu($event, item, 'stok_akhir')" @mousedown="handleCellMouseDown($event, item, 'stok_akhir', index)" @mouseenter="handleCellMouseEnter($event, item, 'stok_akhir', index)" :class="[isCellSelected(item, 'stok_akhir') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '', item.stok_akhir < 0 ? 'text-red-600' : 'text-indigo-600']" class="px-3 py-1.5 text-right font-mono font-bold">
                {{ item.stok_akhir }}
              </td>

              <!-- Stok MGL -->
              <td :style="getCellBgStyle(item, 'stock_mgl')" @contextmenu.prevent="openContextMenu($event, item, 'stock_mgl')" @mousedown="handleCellMouseDown($event, item, 'stock_mgl', index)" @mouseenter="handleCellMouseEnter($event, item, 'stock_mgl', index)" :class="[isCellSelected(item, 'stock_mgl') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-right font-mono text-teal-600 font-medium">
                {{ item.stock_mgl ?? 0 }}
              </td>
              <td :style="getCellBgStyle(item, 'std_min')" @contextmenu.prevent="openContextMenu($event, item, 'std_min')" @mousedown="handleCellMouseDown($event, item, 'std_min', index)" @mouseenter="handleCellMouseEnter($event, item, 'std_min', index)" :class="[isCellSelected(item, 'std_min') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-2 py-1.5 text-center font-mono text-gray-600 text-xs">{{ item.std_min ?? '-' }}</td>
              <td :style="getCellBgStyle(item, 'std_max')" @contextmenu.prevent="openContextMenu($event, item, 'std_max')" @mousedown="handleCellMouseDown($event, item, 'std_max', index)" @mouseenter="handleCellMouseEnter($event, item, 'std_max', index)" :class="[isCellSelected(item, 'std_max') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-2 py-1.5 text-center font-mono text-gray-600 text-xs">{{ item.std_max ?? '-' }}</td>
              <td :style="getCellBgStyle(item, 'strength_system')" @contextmenu.prevent="openContextMenu($event, item, 'strength_system')" @mousedown="handleCellMouseDown($event, item, 'strength_system', index)" @mouseenter="handleCellMouseEnter($event, item, 'strength_system', index)" :class="[isCellSelected(item, 'strength_system') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-right font-mono text-purple-600">{{ item.strength_system }}</td>
              <td :style="getCellBgStyle(item, 'status_sys')" @contextmenu.prevent="openContextMenu($event, item, 'status_sys')" @mousedown="handleCellMouseDown($event, item, 'status_sys', index)" @mouseenter="handleCellMouseEnter($event, item, 'status_sys', index)" :class="[isCellSelected(item, 'status_sys') ? 'relative outline outline-2 outline-blue-500/60 bg-blue-100/25 z-10' : '']" class="px-3 py-1.5 text-center"><span :class="statusChipClass(item.status)">{{ item.status }}</span></td>
            </tr>
          </tbody>

          <tfoot v-if="filteredList.length > 0" class="sticky bottom-0 z-10">
            <tr class="bg-slate-100 border-t-2 border-slate-300 text-xs font-bold">
              <td colspan="16" class="px-3 py-2 text-right text-gray-600 uppercase text-[11px] tracking-wide">
                Total ({{ filteredList.length }} baris):
              </td>
              <td class="px-3 py-2 text-right font-mono text-green-700">+{{ filteredList.reduce((s, r) => s + (Number(r.qty_in) || 0), 0).toLocaleString() }}</td>
              <td class="px-3 py-2 text-right font-mono text-red-600">-{{ filteredList.reduce((s, r) => s + (Number(r.qty_out) || 0), 0).toLocaleString() }}</td>
              <td colspan="7" class="px-3 py-2 text-[10px] text-gray-400 font-normal">
                <span v-if="isMainAnyFilterActive || mainDateFilter.start">*sesuai filter aktif</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div v-if="showSoDoModal" class="modal-overlay animate-fade-in" @click.self="closeSoDoModal">
      <div class="modal-container max-w-5xl w-full" @click="closeSoColDropdowns">
        <div class="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-gray-200">
          <div>
            <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2">SALES ORDER & DELIVERY ORDER</h3>
            <p class="text-[11px] text-gray-500 mt-0.5">Membaca otomatis data dari PO DATE &amp; CREATE DO.</p>
          </div>
          <button @click="closeSoDoModal" class="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">&times;</button>
        </div>

        <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto bg-slate-50/40">
          <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              <div class="sm:col-span-3">
                <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Pilih Tanggal   :</label>
                <input type="date" v-model="soDoParams.date" class="w-full px-3 py-2 text-xs border rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div class="sm:col-span-9 grid grid-cols-4 gap-2 w-full">
                <!-- Load Qty Out dari Database -->
                <button 
                  @click="handleFetchCombinedSoDo" 
                  :disabled="isLoadingCombined || isSyncingFromSap" 
                  class="flex items-center justify-center gap-1.5 !bg-blue-600 hover:!bg-blue-700 !text-white font-semibold text-xs py-2 px-1 rounded-lg shadow-sm transition-colors disabled:opacity-50 h-[37px] truncate"
                >
                  <svg v-if="isLoadingCombined" class="animate-spin h-3.5 w-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span class="truncate">{{ isLoadingCombined ? 'Memuat...' : 'Load Qty Out' }}</span>
                </button>

                <!-- Generate SAP -->
                <button 
                  @click="handleSyncSoDoFromSap" 
                  :disabled="isSyncingFromSap || isLoadingCombined" 
                  class="flex items-center justify-center gap-1.5 !bg-purple-600 hover:!bg-purple-700 !text-white font-semibold text-xs py-2 px-1 rounded-lg shadow-sm transition-colors disabled:opacity-50 h-[37px] truncate"
                >
                  <svg v-if="isSyncingFromSap" class="animate-spin h-3.5 w-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span class="truncate">{{ isSyncingFromSap ? 'Sync...' : 'Generate SAP' }}</span>
                </button>

                <!-- Export Excel -->
                <button 
                  @click="exportSoToExcel" 
                  :disabled="soFilteredList.length === 0" 
                  class="flex items-center justify-center gap-1.5 !bg-green-600 hover:!bg-green-700 !text-white font-semibold text-xs py-2 px-1 rounded-lg shadow-sm transition-colors disabled:opacity-50 h-[37px] truncate"
                >
                  <span class="truncate">Export Excel</span>
                </button>

                <!-- Simpan Perubahan (Bulk Save) -->
                <button 
                  @click="handleSaveAllCombinedChanges" 
                  :disabled="isLoadingCombined || isSyncingFromSap || getEditedItems().length === 0 || isUpdatingEtdLocal" 
                  class="flex items-center justify-center gap-1.5 !bg-indigo-600 hover:!bg-indigo-700 !text-white font-semibold text-xs py-2 px-1 rounded-lg shadow-sm transition-colors disabled:opacity-50 h-[37px] truncate"
                >
                  <svg v-if="isUpdatingEtdLocal" class="animate-spin h-3.5 w-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span class="truncate">Simpan ({{ getEditedItems().length }})</span>
                </button>
              </div>
            </div>
          </div>

          <div v-if="combinedSalesOrders.length > 0" class="flex flex-wrap gap-2 items-center justify-between p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-gray-700 shadow-sm">
            <div class="flex items-center gap-3 flex-wrap">
              <span class="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-gray-200">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span>Jam Kosong: <strong class="text-red-600 font-mono font-bold">{{ countNullCycledelv }}</strong> baris</span>
              </span>
              <span class="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-gray-200">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Advance Delivery: <strong class="text-emerald-700 font-bold font-mono">{{ advanceDeliveries.length }}</strong> item (<strong class="text-emerald-700 font-mono">{{ totalAdvanceQtyOut.toLocaleString() }}</strong> pcs)</span>
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded font-mono">Tampil: {{ soFilteredList.length }} / {{ displaySoList.length }} Baris</span>
            </div>
          </div>

          <div v-if="combinedSalesOrders.length > 0 && isSoAnyFilterActive" class="flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">Filter Kolom Aktif</span>
            <button @click="resetSoFilters" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors">✕ Bersihkan Semua Filter</button>
          </div>

          <div v-if="displaySoList.length > 0" class="overflow-x-auto overflow-y-auto border border-gray-200 rounded-xl shadow-sm bg-white" style="min-height:200px; max-height:420px;">
            <table class="w-full text-left border-collapse text-xs whitespace-nowrap table-excel" style="width:max-content;min-width:100%;">
              <thead class="bg-slate-50 text-gray-600 font-semibold sticky top-0 z-20 shadow-sm">
                <tr>
                  <th class="px-3 py-2.5 border-b border-gray-200 text-center text-gray-400 w-10">#</th>
                  <th class="px-4 py-2.5 border-b border-gray-200 text-center relative" @click.stop>
                    <div class="flex items-center justify-center gap-1"><span>Type</span><button @click.stop="toggleSoColDropdown('action')" :class="['excel-filter-btn', soColFilters.action.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="soActiveDropdown==='action'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="soColSearch.action" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="isSoColAllSelected('action')" @change="toggleSoColAll('action')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in getSoColOptions('action')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="soColFilters.action" /><span :class="opt==='PODATE'?'text-amber-700 font-bold':'text-blue-700 font-bold'">{{ opt }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>SO Number</span><button @click.stop="toggleSoColDropdown('vbelv')" :class="['excel-filter-btn', soColFilters.vbelv.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="soActiveDropdown==='vbelv'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="soColSearch.vbelv" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="isSoColAllSelected('vbelv')" @change="toggleSoColAll('vbelv')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in getSoColOptions('vbelv')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="soColFilters.vbelv" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>Job Number</span><button @click.stop="toggleSoColDropdown('bismt')" :class="['excel-filter-btn', soColFilters.bismt.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="soActiveDropdown==='bismt'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="soColSearch.bismt" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="isSoColAllSelected('bismt')" @change="toggleSoColAll('bismt')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in getSoColOptions('bismt')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="soColFilters.bismt" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>Part Number</span><button @click.stop="toggleSoColDropdown('matnr')" :class="['excel-filter-btn', soColFilters.matnr.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="soActiveDropdown==='matnr'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="soColSearch.matnr" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="isSoColAllSelected('matnr')" @change="toggleSoColAll('matnr')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in getSoColOptions('matnr')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="soColFilters.matnr" /><span>{{ opt }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>PO Date</span><button @click.stop="toggleSoColDropdown('bstdk')" :class="['excel-filter-btn', soColFilters.bstdk.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="soActiveDropdown==='bstdk'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="soColSearch.bstdk" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="isSoColAllSelected('bstdk')" @change="toggleSoColAll('bstdk')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in getSoColOptions('bstdk')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="soColFilters.bstdk" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 text-right relative" @click.stop>
                    <div class="flex items-center justify-end gap-1"><span>SO QTY</span><button @click.stop="toggleSoColDropdown('kwmeng')" :class="['excel-filter-btn', soColFilters.kwmeng.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="soActiveDropdown==='kwmeng'" class="excel-dropdown excel-dropdown-right" @click.stop><div class="excel-dropdown-search"><input v-model="soColSearch.kwmeng" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="isSoColAllSelected('kwmeng')" @change="toggleSoColAll('kwmeng')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in getSoColOptions('kwmeng')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="soColFilters.kwmeng" /><span>{{ opt }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 text-right relative" @click.stop>
                    <div class="flex items-center justify-end gap-1"><span>DO QTY</span><button @click.stop="toggleSoColDropdown('rfmng')" :class="['excel-filter-btn', soColFilters.rfmng.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="soActiveDropdown==='rfmng'" class="excel-dropdown excel-dropdown-right" @click.stop><div class="excel-dropdown-search"><input v-model="soColSearch.rfmng" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="isSoColAllSelected('rfmng')" @change="toggleSoColAll('rfmng')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in getSoColOptions('rfmng')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="soColFilters.rfmng" /><span>{{ opt }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 text-right relative" @click.stop>
                    <div class="flex items-center justify-end gap-1"><span>QTY OUT</span><button @click.stop="toggleSoColDropdown('qty_out')" :class="['excel-filter-btn', soColFilters.qty_out.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="soActiveDropdown==='qty_out'" class="excel-dropdown excel-dropdown-right" @click.stop><div class="excel-dropdown-search"><input v-model="soColSearch.qty_out" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="isSoColAllSelected('qty_out')" @change="toggleSoColAll('qty_out')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in getSoColOptions('qty_out')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="soColFilters.qty_out" /><span>{{ opt }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>Create DO</span><button @click.stop="toggleSoColDropdown('erdat')" :class="['excel-filter-btn', soColFilters.erdat.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="soActiveDropdown==='erdat'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="soColSearch.erdat" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="isSoColAllSelected('erdat')" @change="toggleSoColAll('erdat')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in getSoColOptions('erdat')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="soColFilters.erdat" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>Time DO</span><button @click.stop="toggleSoColDropdown('erzet')" :class="['excel-filter-btn', soColFilters.erzet.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="soActiveDropdown==='erzet'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="soColSearch.erzet" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="isSoColAllSelected('erzet')" @change="toggleSoColAll('erzet')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in getSoColOptions('erzet')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="soColFilters.erzet" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>DN</span><button @click.stop="toggleSoColDropdown('vbeln')" :class="['excel-filter-btn', soColFilters.vbeln.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="soActiveDropdown==='vbeln'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="soColSearch.vbeln" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="isSoColAllSelected('vbeln')" @change="toggleSoColAll('vbeln')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in getSoColOptions('vbeln')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="soColFilters.vbeln" /><span>{{ opt }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 text-center bg-amber-50/60 text-amber-900 font-bold relative" @click.stop>
                    <div class="flex items-center justify-center gap-1"><span>Cycle Delv</span><button @click.stop="toggleSoColDropdown('vsnmr_v')" :class="['excel-filter-btn', soColFilters.vsnmr_v.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="soActiveDropdown==='vsnmr_v'" class="excel-dropdown excel-dropdown-right" @click.stop><div class="excel-dropdown-search"><input v-model="soColSearch.vsnmr_v" placeholder="Cari jam…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="isSoColAllSelected('vsnmr_v')" @change="toggleSoColAll('vsnmr_v')" /><span>(Semua)</span></label><div class="excel-options-list"><label class="excel-option"><input type="checkbox" value="__NULL__" v-model="soColFilters.vsnmr_v" /><span class="text-red-500 font-medium">(Kosong / Belum Diisi)</span></label><label v-for="opt in getSoColOptions('vsnmr_v')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="soColFilters.vsnmr_v" /><span class="font-mono">{{ opt }}</span></label></div></div>
                  </th>
                </tr>
              </thead>

              <tbody class="divide-y divide-gray-100">
                <tr v-if="soFilteredList.length === 0">
                  <td colspan="13" class="py-8 text-center text-gray-400 text-xs">Tidak ada data yang cocok dengan filter yang aktif.</td>
                </tr>
                <tr v-else v-for="(so, soIdx) in soFilteredList" :key="so.id" class="hover:bg-blue-50/20 transition-colors" :class="[
                  !so.vsnmr_v ? 'bg-red-50/20' : '',
                  isAdvanceDelivery(so) ? 'bg-emerald-50/30 hover:bg-emerald-50/40 border-l-4 border-emerald-500' : ''
                ]">
                  <td class="px-3 py-2 text-center text-gray-400 font-mono text-[10px] bg-gray-50/50 select-none">{{ soIdx + 1 }}</td>
                  <td class="px-4 py-2 text-center">
                    <span :class="getDisplayType(so)==='PODATE'?'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800':'px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800'">
                      {{ getDisplayType(so) }}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-gray-700 font-mono">{{ so.vbelv||'-' }}</td>
                  <td class="px-4 py-2 text-gray-700 font-medium">{{ so.bismt||'-' }}</td>
                  <td class="px-4 py-2 text-gray-900 font-mono">{{ so.matnr }}</td>
                  <td class="px-4 py-2 text-gray-500 font-mono">
                    <div class="flex items-center gap-1.5">
                      <span>{{ so.bstdk||'-' }}</span>
                      <span v-if="isAdvanceDelivery(so)" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800" title="Advance Delivery (Created On < PO Date)">
                        Advance
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-2 text-right font-mono text-gray-600">{{ Number(so.kwmeng) ? Number(so.kwmeng).toLocaleString() : '-' }}</td>
                  <td class="px-4 py-2 text-right font-mono text-gray-600">{{ so.rfmng||'0' }}</td>
                  <td class="px-4 py-2 text-right font-bold text-red-500 font-mono">{{ Number(so.qty_out) ? Number(so.qty_out).toLocaleString() : '-' }}</td>
                  <td class="px-4 py-2 text-gray-500 font-mono">{{ formatSapDate(so.erdat) }}</td>
                  <td class="px-4 py-2 text-gray-500 font-mono">{{ formatSapTime(so.erzet) }}</td>
                  <td class="px-4 py-2 font-mono text-blue-600 font-semibold">{{ so.vbeln }}</td>
                  <td class="px-4 py-1.5 bg-amber-50/20 text-center">
                    <input type="time" step="1" v-model="so.vsnmr_v" class="border rounded-lg px-2 py-1 text-center font-bold text-blue-700 font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm" :class="!so.vsnmr_v?'border-red-300 bg-red-100/60':'border-amber-300 bg-white'" />
                  </td>
                </tr>
              </tbody>

              <tfoot class="sticky bottom-0 z-10 bg-slate-100 border-t-2 border-slate-300 font-bold text-xs shadow-sm">
                <tr class="bg-slate-100">
                  <td colspan="6" class="px-4 py-2.5 text-right text-gray-600 font-semibold tracking-wide uppercase text-[11px]">Total ({{ soFilteredList.length }} baris):</td>
                  <td class="px-4 py-2.5 text-right font-mono text-gray-700">{{ soFilteredList.reduce((s:number,r:any)=>s+(Number(r.kwmeng)||0),0).toLocaleString() }}</td>
                  <td class="px-4 py-2.5 text-right font-mono text-gray-700">{{ soFilteredList.reduce((s:number,r:any)=>s+(Number(r.rfmng)||0),0).toLocaleString() }}</td>
                  <td class="px-4 py-2.5 text-right font-mono text-red-600 text-sm">{{ soFilteredTotalQtyOut.toLocaleString() }}</td>
                  <td colspan="4" class="px-4 py-2.5 text-[10px] text-gray-400 font-normal"><span v-if="isSoAnyFilterActive">*sesuai filter aktif</span></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div v-if="displaySoList.length === 0 && !isLoadingCombined" class="py-14 text-center text-gray-400 bg-white rounded-xl border border-gray-200 shadow-sm font-medium text-xs">
            💡 Tentukan tanggal, kemudian klik <strong class="text-blue-600">Load Sales Order</strong> untuk memuat data sales order.
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-gray-200 flex flex-wrap justify-between items-center gap-4">
          <div class="flex items-center gap-4 flex-wrap">
            <!-- Filter Jam Cycle Delivery -->
            <div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
              <span class="text-[11px] font-bold text-gray-600 mr-1">Filter Jam Cycle Delivery:</span>
              <label class="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none mr-2 bg-blue-50/50 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors border border-blue-100/50">
                <input type="checkbox" v-model="syncTimeRange.allHours" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
                <span class="text-[11px] font-medium text-blue-800">Semua Jam</span>
              </label>
              <template v-if="!syncTimeRange.allHours">
                <input type="time" v-model="syncTimeRange.start" class="border rounded px-1.5 py-0.5 font-mono text-xs text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <span class="text-xs text-gray-400">s/d</span>
                <input type="time" v-model="syncTimeRange.end" class="border rounded px-1.5 py-0.5 font-mono text-xs text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </template>
              <template v-else>
                <span class="text-[11px] text-gray-500 italic bg-gray-50 px-2 py-0.5 rounded border border-gray-100 font-mono">00:00 s/d 23:59</span>
              </template>
            </div>

            <!-- Filter Advance Delivery -->
            <div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
              <span class="text-[11px] font-bold text-gray-600 mr-1">Tipe Pengiriman:</span>
              <label class="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none bg-emerald-50/50 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors border border-emerald-100/50">
                <input type="checkbox" v-model="filterAdvanceOnly" class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5" />
                <span class="font-semibold text-emerald-800">Hanya Advance Delivery</span>
              </label>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="store.filters.tanggal !== soDoParams.date" class="text-[11px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl shadow-sm">
              Tanggal Mutasi ({{ store.filters.tanggal || '-' }}) ≠ Tanggal SO ({{ soDoParams.date }}) — Export Excel tetap dapat diunduh.
            </span>
            <button @click="closeSoDoModal" class="px-4 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">Close</button>
            <button @click="handleSaveQtyToMovement" :disabled="isSavingQtyLocal || displaySoList.length === 0" class="px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5" style="background-color:#2563eb !important;color:#ffffff !important;border:none !important;" onmouseover="this.style.backgroundColor='#1d4ed8'" onmouseout="this.style.backgroundColor='#2563eb'">
              <svg v-if="isSavingQtyLocal" class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              {{ isSavingQtyLocal ? 'Menyimpan…' : 'Simpan ke Mutasi' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- DEDICATED CONFIRMATION MODAL -->
    <div v-if="showSyncConfirmModal" class="modal-overlay animate-fade-in" @click.self="closeSyncConfirmModal">
      <div class="modal-container max-w-5xl w-full" @click="syncConfirmFilter.closeDropdowns">
        <div class="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-gray-200">
          <div>
            <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2">Konfirmasi Simpan ke Mutasi</h3>
            <p class="text-[11px] text-gray-500 mt-0.5">Filter dan ekspor baris yang akan disinkronkan ke Stock Movement.</p>
          </div>
          <button @click="closeSyncConfirmModal" class="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">&times;</button>
        </div>

        <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto bg-slate-50/40">
          <div v-if="syncConfirmFilteredList.length > 0 && syncConfirmFilter.isAnyFilterActive.value" class="flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">Filter Kolom Aktif</span>
            <button @click="syncConfirmFilter.resetFilters()" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors">✕ Bersihkan Semua Filter</button>
          </div>

          <div v-if="syncConfirmItems.length > 0" class="overflow-x-auto overflow-y-auto border border-gray-200 rounded-xl shadow-sm bg-white" style="min-height:200px; max-height:420px;">
            <table class="w-full text-left border-collapse text-xs whitespace-nowrap table-excel" style="width:max-content;min-width:100%;">
              <thead class="bg-slate-50 text-gray-600 font-semibold sticky top-0 z-20 shadow-sm">
                <tr>
                  <th class="px-3 py-2.5 border-b border-gray-200 text-center text-gray-400 w-10">#</th>
                  <th class="px-4 py-2.5 border-b border-gray-200 text-center relative" @click.stop>
                    <div class="flex items-center justify-center gap-1"><span>Type</span><button @click.stop="syncConfirmFilter.toggleDropdown('action')" :class="['excel-filter-btn', syncConfirmFilter.colFilters.action.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="syncConfirmFilter.activeDropdown.value==='action'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="syncConfirmFilter.colSearch.action" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="syncConfirmFilter.isColAllSelected('action')" @change="syncConfirmFilter.toggleColAll('action')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in syncConfirmFilter.getColOptions('action')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="syncConfirmFilter.colFilters.action" /><span :class="opt==='PODATE'?'text-amber-700 font-bold':'text-blue-700 font-bold'">{{ opt }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>SO Number</span><button @click.stop="syncConfirmFilter.toggleDropdown('vbelv')" :class="['excel-filter-btn', syncConfirmFilter.colFilters.vbelv.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="syncConfirmFilter.activeDropdown.value==='vbelv'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="syncConfirmFilter.colSearch.vbelv" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="syncConfirmFilter.isColAllSelected('vbelv')" @change="syncConfirmFilter.toggleColAll('vbelv')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in syncConfirmFilter.getColOptions('vbelv')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="syncConfirmFilter.colFilters.vbelv" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>Job Number</span><button @click.stop="syncConfirmFilter.toggleDropdown('bismt')" :class="['excel-filter-btn', syncConfirmFilter.colFilters.bismt.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="syncConfirmFilter.activeDropdown.value==='bismt'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="syncConfirmFilter.colSearch.bismt" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="syncConfirmFilter.isColAllSelected('bismt')" @change="syncConfirmFilter.toggleColAll('bismt')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in syncConfirmFilter.getColOptions('bismt')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="syncConfirmFilter.colFilters.bismt" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>Part Number</span><button @click.stop="syncConfirmFilter.toggleDropdown('matnr')" :class="['excel-filter-btn', syncConfirmFilter.colFilters.matnr.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="syncConfirmFilter.activeDropdown.value==='matnr'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="syncConfirmFilter.colSearch.matnr" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="syncConfirmFilter.isColAllSelected('matnr')" @change="syncConfirmFilter.toggleColAll('matnr')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in syncConfirmFilter.getColOptions('matnr')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="syncConfirmFilter.colFilters.matnr" /><span>{{ opt }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>PO Date</span><button @click.stop="syncConfirmFilter.toggleDropdown('bstdk')" :class="['excel-filter-btn', syncConfirmFilter.colFilters.bstdk.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="syncConfirmFilter.activeDropdown.value==='bstdk'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="syncConfirmFilter.colSearch.bstdk" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="syncConfirmFilter.isColAllSelected('bstdk')" @change="syncConfirmFilter.toggleColAll('bstdk')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in syncConfirmFilter.getColOptions('bstdk')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="syncConfirmFilter.colFilters.bstdk" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 text-right relative" @click.stop>
                    <div class="flex items-center justify-end gap-1"><span>Qty Sales Order</span><button @click.stop="syncConfirmFilter.toggleDropdown('kwmeng')" :class="['excel-filter-btn', syncConfirmFilter.colFilters.kwmeng.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="syncConfirmFilter.activeDropdown.value==='kwmeng'" class="excel-dropdown" @click.stop style="right:0;left:auto;"><div class="excel-dropdown-search"><input v-model="syncConfirmFilter.colSearch.kwmeng" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="syncConfirmFilter.isColAllSelected('kwmeng')" @change="syncConfirmFilter.toggleColAll('kwmeng')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in syncConfirmFilter.getColOptions('kwmeng')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="syncConfirmFilter.colFilters.kwmeng" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 text-right relative" @click.stop>
                    <div class="flex items-center justify-end gap-1"><span>Qty DO</span><button @click.stop="syncConfirmFilter.toggleDropdown('rfmng')" :class="['excel-filter-btn', syncConfirmFilter.colFilters.rfmng.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="syncConfirmFilter.activeDropdown.value==='rfmng'" class="excel-dropdown" @click.stop style="right:0;left:auto;"><div class="excel-dropdown-search"><input v-model="syncConfirmFilter.colSearch.rfmng" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="syncConfirmFilter.isColAllSelected('rfmng')" @change="syncConfirmFilter.toggleColAll('rfmng')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in syncConfirmFilter.getColOptions('rfmng')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="syncConfirmFilter.colFilters.rfmng" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 text-right relative" @click.stop>
                    <div class="flex items-center justify-end gap-1"><span>Qty Out</span><button @click.stop="syncConfirmFilter.toggleDropdown('qty_out')" :class="['excel-filter-btn', syncConfirmFilter.colFilters.qty_out.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="syncConfirmFilter.activeDropdown.value==='qty_out'" class="excel-dropdown" @click.stop style="right:0;left:auto;"><div class="excel-dropdown-search"><input v-model="syncConfirmFilter.colSearch.qty_out" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="syncConfirmFilter.isColAllSelected('qty_out')" @change="syncConfirmFilter.toggleColAll('qty_out')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in syncConfirmFilter.getColOptions('qty_out')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="syncConfirmFilter.colFilters.qty_out" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>Create DO</span><button @click.stop="syncConfirmFilter.toggleDropdown('erdat')" :class="['excel-filter-btn', syncConfirmFilter.colFilters.erdat.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="syncConfirmFilter.activeDropdown.value==='erdat'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="syncConfirmFilter.colSearch.erdat" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="syncConfirmFilter.isColAllSelected('erdat')" @change="syncConfirmFilter.toggleColAll('erdat')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in syncConfirmFilter.getColOptions('erdat')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="syncConfirmFilter.colFilters.erdat" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>Time DO</span><button @click.stop="syncConfirmFilter.toggleDropdown('erzet')" :class="['excel-filter-btn', syncConfirmFilter.colFilters.erzet.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="syncConfirmFilter.activeDropdown.value==='erzet'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="syncConfirmFilter.colSearch.erzet" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="syncConfirmFilter.isColAllSelected('erzet')" @change="syncConfirmFilter.toggleColAll('erzet')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in syncConfirmFilter.getColOptions('erzet')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="syncConfirmFilter.colFilters.erzet" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>DO Number</span><button @click.stop="syncConfirmFilter.toggleDropdown('vbeln')" :class="['excel-filter-btn', syncConfirmFilter.colFilters.vbeln.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="syncConfirmFilter.activeDropdown.value==='vbeln'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="syncConfirmFilter.colSearch.vbeln" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="syncConfirmFilter.isColAllSelected('vbeln')" @change="syncConfirmFilter.toggleColAll('vbeln')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in syncConfirmFilter.getColOptions('vbeln')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="syncConfirmFilter.colFilters.vbeln" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                  <th class="px-4 py-2.5 border-b border-gray-200 relative" @click.stop>
                    <div class="flex items-center gap-1"><span>Cycle Delivery</span><button @click.stop="syncConfirmFilter.toggleDropdown('vsnmr_v')" :class="['excel-filter-btn', syncConfirmFilter.colFilters.vsnmr_v.length?'excel-filter-btn-active':'']">▼</button></div>
                    <div v-if="syncConfirmFilter.activeDropdown.value==='vsnmr_v'" class="excel-dropdown" @click.stop style="right:0;left:auto;"><div class="excel-dropdown-search"><input v-model="syncConfirmFilter.colSearch.vsnmr_v" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="syncConfirmFilter.isColAllSelected('vsnmr_v')" @change="syncConfirmFilter.toggleColAll('vsnmr_v')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in syncConfirmFilter.getColOptions('vsnmr_v')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="syncConfirmFilter.colFilters.vsnmr_v" /><span>{{ opt||'-' }}</span></label></div></div>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(item, idx) in syncConfirmFilteredList" :key="item.id || idx" class="hover:bg-slate-50/70 transition-colors" :class="[
                  isAdvanceDelivery(item) ? 'bg-emerald-50/30 border-l-4 border-emerald-500 font-semibold text-emerald-950' : ''
                ]">
                  <td class="px-3 py-1.5 text-center text-gray-400 font-medium">{{ idx + 1 }}</td>
                  <td class="px-4 py-1.5 text-center"><span :class="item.action==='PODATE'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'" class="px-2 py-0.5 rounded text-[10px] font-bold">{{ item.action }}</span></td>
                  <td class="px-4 py-1.5 text-gray-600 font-mono">{{ item.vbelv || '-' }}</td>
                  <td class="px-4 py-1.5 text-gray-600 font-mono">{{ item.bismt || '-' }}</td>
                  <td class="px-4 py-1.5 font-bold text-gray-800">{{ item.matnr }}</td>
                  <td class="px-4 py-1.5 text-gray-600 font-mono">
                    <div class="flex items-center gap-1.5">
                      <span>{{ item.bstdk || '-' }}</span>
                      <span v-if="isAdvanceDelivery(item)" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800" title="Advance Delivery (Created On < PO Date)">
                        Advance
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-1.5 text-right font-mono text-gray-700">{{ Number(item.kwmeng) ? Number(item.kwmeng).toLocaleString() : '-' }}</td>
                  <td class="px-4 py-1.5 text-right font-mono text-gray-700">{{ Number(item.rfmng) ? Number(item.rfmng).toLocaleString() : '-' }}</td>
                  <td class="px-4 py-1.5 text-right font-mono font-bold text-red-600">{{ Number(item.qty_out) ? Number(item.qty_out).toLocaleString() : '-' }}</td>
                  <td class="px-4 py-1.5 text-gray-600 font-mono">{{ formatSapDate(item.erdat) }}</td>
                  <td class="px-4 py-1.5 text-gray-600 font-mono">{{ formatSapTime(item.erzet) }}</td>
                  <td class="px-4 py-1.5 text-gray-600 font-mono">{{ item.vbeln || '-' }}</td>
                  <td class="px-4 py-1.5 text-gray-800 font-mono font-semibold">{{ item.vsnmr_v || '-' }}</td>
                </tr>
                <tr v-if="syncConfirmFilteredList.length === 0">
                  <td colspan="13" class="px-4 py-8 text-center text-gray-400 font-medium bg-gray-50/50">
                    Tidak ada data yang sesuai filter aktif.
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="syncConfirmFilteredList.length > 0" class="sticky bottom-0 z-10">
                <tr class="bg-slate-100 border-t-2 border-slate-300 text-xs font-bold">
                  <td colspan="6" class="px-4 py-2 text-right text-gray-600 uppercase text-[11px] tracking-wide">
                    Total ({{ syncConfirmFilteredList.length }} baris):
                  </td>
                  <td class="px-4 py-2 text-right font-mono text-gray-700">{{ syncConfirmFilteredList.reduce((s, r) => s + (Number(r.kwmeng) || 0), 0).toLocaleString() }}</td>
                  <td class="px-4 py-2 text-right font-mono text-gray-700">{{ syncConfirmFilteredList.reduce((s, r) => s + (Number(r.rfmng) || 0), 0).toLocaleString() }}</td>
                  <td class="px-4 py-2 text-right font-mono text-red-600">{{ syncConfirmFilteredList.reduce((s, r) => s + (Number(r.qty_out) || 0), 0).toLocaleString() }}</td>
                  <td colspan="4" class="px-4 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-gray-200 flex flex-wrap justify-end items-center gap-3">
          <span v-if="store.filters.tanggal !== soDoParams.date" class="text-[11px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl shadow-sm mr-auto">
            ⚠️ Tanggal SO ({{ soDoParams.date }}) ≠ Tanggal Mutasi ({{ store.filters.tanggal || '-' }}). Simpan ke Mutasi dinonaktifkan.
          </span>
          <button @click="exportSyncConfirmToExcel" class="px-4 py-2 bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 hover:bg-emerald-200 shadow-sm transition-colors flex items-center gap-2" :class="store.filters.tanggal === soDoParams.date ? 'mr-auto' : ''">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            Export Excel
          </button>
          <button @click="closeSyncConfirmModal" :disabled="isSavingQtyLocal" class="px-4 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50">Batal</button>
          <button @click="executeSyncToMovement" :disabled="isSavingQtyLocal || syncConfirmFilteredList.length === 0 || store.filters.tanggal !== soDoParams.date" class="px-4 py-2 bg-blue-600 border border-transparent rounded-xl text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2" :title="store.filters.tanggal !== soDoParams.date ? 'Tanggal SO dan Tanggal Mutasi harus sama untuk menyimpan' : ''">
            <svg v-if="isSavingQtyLocal" class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ isSavingQtyLocal ? 'Menyimpan...' : '✓ Simpan ke Mutasi' }}
          </button>
        </div>
      </div>
    </div>

    <!-- PLANNING SEGMENT -->
    <div class="card p-0 mt-6" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff;">
      <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-gray-100 flex-wrap gap-4">
        <div class="flex items-center gap-4 flex-wrap">
          <h2 class="text-base font-bold text-gray-800 flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Planning Segment
          </h2>
          <div v-if="planningList.length > 0" class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider md:ml-4 md:border-l md:border-gray-200 md:pl-4">
            <span class="px-2 py-1 bg-red-50 text-red-700 rounded-md border border-red-200 shadow-sm flex items-center gap-1">Kritis <span class="bg-red-600 text-white px-1.5 py-0.5 rounded text-[9px]">{{ planningList.filter(i => i.strength_status === 'KRITIS').length }}</span></span>
            <span class="px-2 py-1 bg-green-50 text-green-700 rounded-md border border-green-200 shadow-sm flex items-center gap-1">Safe <span class="bg-green-600 text-white px-1.5 py-0.5 rounded text-[9px]">{{ planningList.filter(i => i.strength_status === 'SAFE').length }}</span></span>
            <span class="px-2 py-1 bg-amber-50 text-amber-700 rounded-md border border-amber-200 shadow-sm flex items-center gap-1">Over <span class="bg-amber-600 text-white px-1.5 py-0.5 rounded text-[9px]">{{ planningList.filter(i => i.strength_status === 'OVER').length }}</span></span>
          </div>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <label class="text-xs font-semibold text-gray-600">Tanggal:</label>
            <input type="date" v-model="planningFilter.tanggal" class="border rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs font-semibold text-gray-600">Shift:</label>
            <select v-model="planningFilter.shift" class="border rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-blue-500 focus:outline-none">
              <option value="1">Shift 1</option>
              <option value="2">Shift 2 (All day)</option>
            </select>
          </div>
          <button @click="fetchPlanning" :disabled="isPlanningLoading" class="btn btn-blue hover:!bg-blue-700 transition-colors !bg-blue-600 !text-white !border-blue-600 text-xs py-1.5 px-4 shadow-sm">
            <span v-if="isPlanningLoading" class="flex items-center gap-1.5">
              <svg class="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Loading...
            </span>
            <span v-else>Load Data</span>
          </button>
        </div>
      </div>
      <div class="p-4 overflow-x-auto" style="max-height: 500px;" @click="planFilter.closeDropdowns">
        <div v-if="planFilteredList.length > 0 && planFilter.isAnyFilterActive.value" class="mb-3 flex items-center gap-2 flex-wrap">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">Filter Kolom Aktif</span>
          <button @click="planFilter.resetFilters()" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors">✕ Bersihkan Semua Filter</button>
        </div>
        <table class="w-full text-left border-collapse text-sm whitespace-nowrap table-excel">
          <thead class="bg-gray-50 text-gray-600 uppercase text-xs sticky top-0 z-10 shadow-sm">
            <tr>
              <th class="px-4 py-3 border-b border-gray-200 relative" @click.stop>
                <div class="flex items-center gap-1"><span>Part Number</span><button @click.stop="planFilter.toggleDropdown('matnr')" :class="['excel-filter-btn', planFilter.colFilters.matnr.length?'excel-filter-btn-active':'']">▼</button></div>
                <div v-if="planFilter.activeDropdown.value==='matnr'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="planFilter.colSearch.matnr" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="planFilter.isColAllSelected('matnr')" @change="planFilter.toggleColAll('matnr')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in planFilter.getColOptions('matnr')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="planFilter.colFilters.matnr" /><span>{{ opt }}</span></label></div></div>
              </th>
              <th class="px-4 py-3 border-b border-gray-200 relative" @click.stop>
                <div class="flex items-center gap-1"><span>Job Number</span><button @click.stop="planFilter.toggleDropdown('job_number')" :class="['excel-filter-btn', planFilter.colFilters.job_number.length?'excel-filter-btn-active':'']">▼</button></div>
                <div v-if="planFilter.activeDropdown.value==='job_number'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="planFilter.colSearch.job_number" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="planFilter.isColAllSelected('job_number')" @change="planFilter.toggleColAll('job_number')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in planFilter.getColOptions('job_number')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="planFilter.colFilters.job_number" /><span>{{ opt||'-' }}</span></label></div></div>
              </th>
              <th class="px-4 py-3 border-b border-gray-200 relative" @click.stop>
                <div class="flex items-center gap-1"><span>Routing</span><button @click.stop="planFilter.toggleDropdown('zrouting')" :class="['excel-filter-btn', planFilter.colFilters.zrouting.length?'excel-filter-btn-active':'']">▼</button></div>
                <div v-if="planFilter.activeDropdown.value==='zrouting'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="planFilter.colSearch.zrouting" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="planFilter.isColAllSelected('zrouting')" @change="planFilter.toggleColAll('zrouting')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in planFilter.getColOptions('zrouting')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="planFilter.colFilters.zrouting" /><span>{{ opt||'-' }}</span></label></div></div>
              </th>
              <th class="px-4 py-3 border-b border-gray-200 text-right relative" @click.stop>
                <div class="flex items-center justify-end gap-1"><span>Stok</span><button @click.stop="planFilter.toggleDropdown('labst')" :class="['excel-filter-btn', planFilter.colFilters.labst.length?'excel-filter-btn-active':'']">▼</button></div>
                <div v-if="planFilter.activeDropdown.value==='labst'" class="excel-dropdown" @click.stop style="right:0;left:auto;"><div class="excel-dropdown-search"><input v-model="planFilter.colSearch.labst" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="planFilter.isColAllSelected('labst')" @change="planFilter.toggleColAll('labst')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in planFilter.getColOptions('labst')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="planFilter.colFilters.labst" /><span>{{ opt||'-' }}</span></label></div></div>
              </th>
              <th class="px-4 py-3 border-b border-gray-200 text-right relative" @click.stop>
                <div class="flex items-center justify-end gap-1"><span>PCS/day</span><button @click.stop="planFilter.toggleDropdown('pcs_kanban')" :class="['excel-filter-btn', planFilter.colFilters.pcs_kanban.length?'excel-filter-btn-active':'']">▼</button></div>
                <div v-if="planFilter.activeDropdown.value==='pcs_kanban'" class="excel-dropdown" @click.stop style="right:0;left:auto;"><div class="excel-dropdown-search"><input v-model="planFilter.colSearch.pcs_kanban" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="planFilter.isColAllSelected('pcs_kanban')" @change="planFilter.toggleColAll('pcs_kanban')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in planFilter.getColOptions('pcs_kanban')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="planFilter.colFilters.pcs_kanban" /><span>{{ opt||'-' }}</span></label></div></div>
              </th>
              <th class="px-4 py-3 border-b border-gray-200 text-center">Min-Max Str</th>
              <th class="px-4 py-3 border-b border-gray-200 text-center relative" @click.stop>
                <div class="flex items-center justify-center gap-1"><span>Strength</span><button @click.stop="planFilter.toggleDropdown('zstrength')" :class="['excel-filter-btn', planFilter.colFilters.zstrength.length?'excel-filter-btn-active':'']">▼</button></div>
                <div v-if="planFilter.activeDropdown.value==='zstrength'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="planFilter.colSearch.zstrength" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="planFilter.isColAllSelected('zstrength')" @change="planFilter.toggleColAll('zstrength')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in planFilter.getColOptions('zstrength')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="planFilter.colFilters.zstrength" /><span>{{ opt||'-' }}</span></label></div></div>
              </th>
              <th class="px-4 py-3 border-b border-gray-200 text-center relative" @click.stop>
                <div class="flex items-center justify-center gap-1"><span>Strength Status</span><button @click.stop="planFilter.toggleDropdown('strength_status')" :class="['excel-filter-btn', planFilter.colFilters.strength_status.length?'excel-filter-btn-active':'']">▼</button></div>
                <div v-if="planFilter.activeDropdown.value==='strength_status'" class="excel-dropdown" @click.stop><div class="excel-dropdown-search"><input v-model="planFilter.colSearch.strength_status" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="planFilter.isColAllSelected('strength_status')" @change="planFilter.toggleColAll('strength_status')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in planFilter.getColOptions('strength_status')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="planFilter.colFilters.strength_status" /><span>{{ opt||'-' }}</span></label></div></div>
              </th>
              <th class="px-4 py-3 border-b border-gray-200 text-right relative" @click.stop>
                <div class="flex items-center justify-end gap-1"><span>Lot Size</span><button @click.stop="planFilter.toggleDropdown('lotsize')" :class="['excel-filter-btn', planFilter.colFilters.lotsize.length?'excel-filter-btn-active':'']">▼</button></div>
                <div v-if="planFilter.activeDropdown.value==='lotsize'" class="excel-dropdown" @click.stop style="right:0;left:auto;"><div class="excel-dropdown-search"><input v-model="planFilter.colSearch.lotsize" placeholder="Cari…" class="excel-search-input" @click.stop /></div><label class="excel-check-all"><input type="checkbox" :checked="planFilter.isColAllSelected('lotsize')" @change="planFilter.toggleColAll('lotsize')" /><span>(Semua)</span></label><div class="excel-options-list"><label v-for="opt in planFilter.getColOptions('lotsize')" :key="opt" class="excel-option"><input type="checkbox" :value="opt" v-model="planFilter.colFilters.lotsize" /><span>{{ opt||'-' }}</span></label></div></div>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="isPlanningLoading">
              <td colspan="9" class="px-4 py-8 text-center text-gray-400 font-medium">Memuat data planning...</td>
            </tr>
            <tr v-else-if="planFilteredList.length === 0">
              <td colspan="9" class="px-4 py-8 text-center text-gray-400 font-medium">Tidak ada data. Silakan tentukan tanggal dan shift lalu klik Load Data.</td>
            </tr>
            <tr v-else v-for="(item, idx) in planFilteredList" :key="'plan-'+idx" class="hover:bg-gray-50/80 transition-colors">
              <td class="px-4 py-3 font-semibold text-gray-800">{{ item.matnr }}</td>
              <td class="px-4 py-3 text-gray-600">{{ item.job_number || '-' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ item.zrouting }}</td>
              <td class="px-4 py-3 text-right font-mono text-gray-700 font-bold">{{ item.labst ?? '-' }}</td>
              <td class="px-4 py-3 text-right font-mono text-blue-700 font-bold">{{ item.pcs_kanban ?? '-' }}</td>
              <td class="px-4 py-3 text-center text-gray-600">{{ item.min_str }} - {{ item.max_str }}</td>
              <td class="px-4 py-3 text-center text-gray-700 font-mono font-bold">{{ item.zstrength ?? '-' }}</td>
              <td class="px-4 py-3 text-center">
                <span :class="['px-2 py-1 rounded text-[10px] font-bold tracking-wide border', 
                  item.strength_status === 'KRITIS' ? 'bg-red-50 text-red-700 border-red-200' : 
                  item.strength_status === 'OVER' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                  'bg-green-50 text-green-700 border-green-200']">
                  {{ item.strength_status }}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-mono text-gray-700">{{ item.lotsize || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- UPLOAD EXCEL MGL MODAL -->
    <div v-if="showUploadExcelModal" class="modal-overlay animate-fade-in" @click.self="closeUploadExcelModal">
      <div class="modal-container max-w-md w-full">
        <div class="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-gray-200">
          <div>
            <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2">UPLOAD EXCEL MGL</h3>
            <p class="text-[11px] text-gray-500 mt-0.5">Upload file excel untuk sinkronisasi stock movement.</p>
          </div>
          <button @click="closeUploadExcelModal" class="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none" :disabled="uploadExcelParams.isUploading">&times;</button>
        </div>

        <div class="p-6 space-y-4 bg-white">
          <div>
            <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Tanggal <span class="text-red-500">*</span></label>
            <input type="date" v-model="uploadExcelParams.date" :disabled="uploadExcelParams.isUploading" class="w-full px-3 py-2 text-xs border rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Shift <span class="text-red-500">*</span></label>
            <select v-model="uploadExcelParams.shift" :disabled="uploadExcelParams.isUploading" class="w-full px-3 py-2 text-xs border rounded-lg border-gray-300 focus:border-blue-500 focus:outline-none">
              <option value="1">Shift 1</option>
              <option value="2">Shift 2 (All day)</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Pilihan Upload (Tipe Baca Kolom)</label>
            <select v-model="uploadExcelParams.type_upload" :disabled="uploadExcelParams.isUploading" class="w-full px-3 py-2 text-xs border rounded-lg border-gray-300 focus:border-blue-500 focus:outline-none">
              <option value="">Semua (Baca Kolom M &amp; O)</option>
              <option value="tabungan">Tabungan (Hanya Kolom M)</option>
              <option value="mgl">MGL (Hanya Kolom O)</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">File Excel (.xlsx, .xls) <span class="text-red-500">*</span></label>
            <label
              class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
              :class="[
                uploadFile ? 'border-green-400 bg-green-50/30 hover:bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100',
                uploadExcelParams.isUploading ? 'opacity-60 cursor-not-allowed' : ''
              ]"
            >
              <div v-if="!uploadFile" class="flex flex-col items-center gap-1.5 text-gray-400">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span class="text-xs font-semibold">Klik untuk pilih file</span>
                <span class="text-[10px]">Format: .xlsx, .xls</span>
              </div>
              <div v-else class="flex flex-col items-center gap-1.5 text-green-600">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-xs font-semibold text-center px-4 break-all">{{ uploadFile.name }}</span>
              </div>
              <input
                ref="fileInputRef"
                type="file"
                accept=".xlsx,.xls"
                class="hidden"
                :disabled="uploadExcelParams.isUploading"
                @change="onExcelFileChange"
              />
            </label>
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-gray-200 flex justify-end gap-2">
          <button @click="closeUploadExcelModal" :disabled="uploadExcelParams.isUploading" class="px-4 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50">Batal</button>
          <button @click="submitUploadExcel" :disabled="uploadExcelParams.isUploading || !uploadFile" class="px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5" style="background-color:#16a34a !important;color:#ffffff !important;border:none !important;" onmouseover="this.style.backgroundColor='#15803d'" onmouseout="this.style.backgroundColor='#16a34a'">
            <svg v-if="uploadExcelParams.isUploading" class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ uploadExcelParams.isUploading ? 'Mengupload…' : 'Submit Excel' }}
          </button>
        </div>
      </div>
    </div>

    <!-- EXPORT QTY IN MODAL -->
    <div v-if="showExportQtyInModal" class="modal-overlay animate-fade-in" @click.self="closeExportQtyInModal">
      <div class="modal-container max-w-md w-full">
        <div class="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-gray-200">
          <div>
            <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2">EXPORT QTY IN</h3>
            <p class="text-[11px] text-gray-500 mt-0.5">Pilih tanggal untuk mengekspor data QTY In.</p>
          </div>
          <button @click="closeExportQtyInModal" :disabled="isExportingQtyIn" class="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none disabled:opacity-50">&times;</button>
        </div>

        <div class="p-6 space-y-4 bg-white">
          <div>
            <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Tanggal <span class="text-red-500">*</span></label>
            <input type="date" v-model="exportQtyInParams.date" :disabled="isExportingQtyIn" class="w-full px-3 py-2 text-xs border rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-gray-200 flex justify-end gap-2">
          <button @click="closeExportQtyInModal" :disabled="isExportingQtyIn" class="px-4 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50">Batal</button>
          <button @click="submitExportQtyIn" :disabled="isExportingQtyIn || !exportQtyInParams.date" class="px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50" style="background-color:#2563eb !important;color:#ffffff !important;border:none !important;" onmouseover="this.style.backgroundColor='#1d4ed8'" onmouseout="this.style.backgroundColor='#2563eb'">
            <svg v-if="isExportingQtyIn" class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isExportingQtyIn ? 'Mengekspor…' : 'Export Excel' }}
          </button>
        </div>
      </div>
    </div>

    <!-- EXPORT EXCEL MUTASI MODAL -->
    <div v-if="showExportModal" class="modal-overlay animate-fade-in" @click.self="closeExportModal">
      <div class="modal-container max-w-md w-full">
        <div class="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-gray-200">
          <div>
            <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2">EXPORT EXCEL MUTASI</h3>
            <p class="text-[11px] text-gray-500 mt-0.5">Pilih tanggal dan shift untuk mengekspor data mutasi.</p>
          </div>
          <button @click="closeExportModal" :disabled="isExporting || isUploadingTemplate" class="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none disabled:opacity-50">&times;</button>
        </div>

        <div class="p-6 space-y-4 bg-white">
          <div>
            <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Tanggal <span class="text-red-500">*</span></label>
            <input type="date" v-model="exportParams.date" :disabled="isExporting || isUploadingTemplate" class="w-full px-3 py-2 text-xs border rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Shift <span class="text-red-500">*</span></label>
            <select v-model="exportParams.shift" :disabled="isExporting || isUploadingTemplate" class="w-full px-3 py-2 text-xs border rounded-lg border-gray-300 focus:border-blue-500 focus:outline-none">
              <option value="1">Shift 1</option>
              <option value="2">Shift 2 (All day)</option>
            </select>
          </div>

          <!-- CUSTOM TEMPLATE UPLOAD -->
          <div class="border-t border-gray-100 pt-4 mt-2">
            <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Template Kustom (Opsional):</label>
            <div class="flex items-center gap-2">
              <label class="flex-1 flex items-center justify-between px-3 py-1.5 border border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors text-xs text-gray-500 overflow-hidden" :class="isExporting || isUploadingTemplate ? 'opacity-50 cursor-not-allowed' : ''">
                <span class="truncate pr-2 font-medium" :class="uploadedTemplateName ? 'text-blue-700 font-bold' : ''">
                  {{ isUploadingTemplate ? 'Mengunggah template ke server...' : (uploadedTemplateName || 'Pilih file template Excel...') }}
                </span>
                <span class="text-[10px] bg-white px-2 py-0.5 border rounded-md shadow-sm font-semibold flex-shrink-0 flex items-center gap-1">
                  <svg v-if="isUploadingTemplate" class="animate-spin h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ isUploadingTemplate ? 'Proses' : 'Pilih' }}
                </span>
                <input type="file" accept=".xlsx,.xls" class="hidden" :disabled="isExporting || isUploadingTemplate" @change="onCustomTemplateChange" />
              </label>
              <button v-if="uploadedTemplateName" @click="clearCustomTemplate" :disabled="isExporting || isUploadingTemplate" class="px-2 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg border border-red-200 text-xs font-bold transition-all disabled:opacity-50" title="Hapus Template">&times;</button>
            </div>
            <p class="text-[10px] text-gray-400 mt-1">Unggah template Anda, lalu sistem akan mengekspor dengan mengisi kolom Stok Awal, In IFPD, In Subc, Out IFPD, dll.</p>
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-gray-200 flex justify-end gap-2">
          <button @click="closeExportModal" :disabled="isExporting || isUploadingTemplate" class="px-4 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50">Batal</button>
          <button @click="submitExportExcel" :disabled="isExporting || isUploadingTemplate" class="px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50" style="background-color:#2563eb !important;color:#ffffff !important;border:none !important;" onmouseover="this.style.backgroundColor='#1d4ed8'" onmouseout="this.style.backgroundColor='#2563eb'">
            <svg v-if="isExporting" class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isExporting ? 'Mengekspor…' : 'Export Excel' }}
          </button>
        </div>
      </div>
    </div>
    <!-- Cell/Row Color Context Menu (Excel style) -->
    <div 
      v-if="contextMenu.show" 
      class="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48 text-xs select-none"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click.stop
    >
      <div class="px-3 py-1.5 font-bold text-gray-500 border-b border-gray-100 flex justify-between items-center">
        <span>Warna Cell / Baris</span>
        <button @click="closeContextMenu" class="text-gray-400 hover:text-gray-600 font-bold">&times;</button>
      </div>
      
      <!-- Apply to Cell -->
      <div class="px-3 py-1.5 text-gray-700 font-semibold bg-gray-50 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        Warnai Cell Ini
      </div>
      <div class="grid grid-cols-4 gap-1 px-2.5 py-1.5">
        <button
          v-for="color in colorPalette"
          :key="'cell-'+color.name"
          @click="applyColor('cell', color.value)"
          class="w-8 h-8 rounded border border-gray-300 hover:scale-105 active:scale-95 transition-transform cursor-pointer relative"
          :style="{ backgroundColor: color.value || '#ffffff' }"
          :title="color.name"
        >
          <span v-if="!color.value" class="absolute inset-0 flex items-center justify-center text-red-500 text-lg font-bold">✕</span>
        </button>
      </div>

      <!-- Apply to Row -->
      <div class="px-3 py-1.5 text-gray-700 font-semibold bg-gray-50 border-t border-gray-100 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
        Warnai Baris Ini
      </div>
      <div class="grid grid-cols-4 gap-1 px-2.5 py-1.5">
        <button
          v-for="color in colorPalette"
          :key="'row-'+color.name"
          @click="applyColor('row', color.value)"
          class="w-8 h-8 rounded border border-gray-300 hover:scale-105 active:scale-95 transition-transform cursor-pointer relative"
          :style="{ backgroundColor: color.value || '#ffffff' }"
          :title="color.name"
        >
          <span v-if="!color.value" class="absolute inset-0 flex items-center justify-center text-red-500 text-lg font-bold">✕</span>
        </button>
      </div>

      <!-- Clear All -->
      <div class="border-t border-gray-100 mt-1">
        <button 
          @click="handleClearAllColors" 
          class="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 font-medium transition-colors cursor-pointer"
        >
          🧹 Hapus Semua Warna Tabel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, onUnmounted, watch, h } from 'vue'
import axios from 'axios'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { useMutationStore } from '@/stores/Logistik/IFP/Transaction/MutationStore'
import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'

const store = useMutationStore()
const authStore = useAuthStore()
const configStore = useConfigStore()

const getTodayDateString = (): string => {
  const today = new Date()
  const hours = today.getHours()
  // Saat masih jam 7-9 pagi (07:00:00 - 08:59:59), defaultnya gunakan tanggal kemarin
  if (hours >= 7 && hours < 9) {
    today.setDate(today.getDate() - 1)
  }
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

// ============================================================
// HELPER: parsing angka yang AMAN — selalu fallback ke 0
// ============================================================
const toNumberSafe = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

// ============================================================
// HELPER: Kalkulasi status berdasarkan strength vs std_min/std_max
// ============================================================
const calcStatus = (strength: number, std_min: number, std_max: number): string => {
  const s = toNumberSafe(strength)
  const min = toNumberSafe(std_min)
  const max = toNumberSafe(std_max)
  if (s < min) return 'KRITIS'
  if (s > max) return 'OVER'
  return 'SAFE'
}

// ============================================================
// CUSTOM DIALOG SYSTEM
// ============================================================
type DialogType = 'success' | 'error' | 'warning' | 'info' | 'confirm'
interface DialogState {
  visible: boolean; type: DialogType; title: string; message: string
  confirmLabel?: string; wide?: boolean; previewItems?: any[]
  onConfirm?: () => void; _onCancel?: () => void
}
const dialogState = reactive<DialogState>({ visible: false, type: 'info', title: '', message: '', confirmLabel: 'Ya, Lanjutkan', wide: false, previewItems: [], onConfirm: undefined, _onCancel: undefined })

const dialogIconComponent = computed(() => {
  const icons: Record<DialogType, any> = {
    success: { render: () => h('svg', { xmlns:'http://www.w3.org/2000/svg', fill:'none', viewBox:'0 0 24 24', 'stroke-width':'2', stroke:'currentColor', class:'w-5 h-5' }, [h('path',{'stroke-linecap':'round','stroke-linejoin':'round',d:'m4.5 12.75 6 6 9-13.5'})]) },
    error:   { render: () => h('svg', { xmlns:'http://www.w3.org/2000/svg', fill:'none', viewBox:'0 0 24 24', 'stroke-width':'2', stroke:'currentColor', class:'w-5 h-5' }, [h('path',{'stroke-linecap':'round','stroke-linejoin':'round',d:'M6 18 18 6M6 6l12 12'})]) },
    warning: { render: () => h('svg', { xmlns:'http://www.w3.org/2000/svg', fill:'none', viewBox:'0 0 24 24', 'stroke-width':'2', stroke:'currentColor', class:'w-5 h-5' }, [h('path',{'stroke-linecap':'round','stroke-linejoin':'round',d:'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z'})]) },
    info:    { render: () => h('svg', { xmlns:'http://www.w3.org/2000/svg', fill:'none', viewBox:'0 0 24 24', 'stroke-width':'2', stroke:'currentColor', class:'w-5 h-5' }, [h('path',{'stroke-linecap':'round','stroke-linejoin':'round',d:'M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z'})]) },
    confirm: { render: () => h('svg', { xmlns:'http://www.w3.org/2000/svg', fill:'none', viewBox:'0 0 24 24', 'stroke-width':'2', stroke:'currentColor', class:'w-5 h-5' }, [h('path',{'stroke-linecap':'round','stroke-linejoin':'round',d:'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z'})]) },
  }
  return icons[dialogState.type]
})
const dialogIconClass = computed(() => ({ 'dialog-icon-success':dialogState.type==='success','dialog-icon-error':dialogState.type==='error','dialog-icon-warning':dialogState.type==='warning','dialog-icon-info':dialogState.type==='info','dialog-icon-confirm':dialogState.type==='confirm' }))
const dialogConfirmBtnClass = computed(() => ({ 'dialog-btn-success':dialogState.type==='success','dialog-btn-danger':dialogState.type==='error'||dialogState.type==='warning','dialog-btn-primary':dialogState.type==='info'||dialogState.type==='confirm' }))

const showAlert = (type: DialogType, title: string, message: string): Promise<void> =>
  new Promise(resolve => Object.assign(dialogState,{visible:true,type,title,message,wide:false,previewItems:[],onConfirm:resolve,_onCancel:undefined}))
const showConfirm = (title:string, message:string, confirmLabel='Ya, Lanjutkan', previewItems:any[]=[]):Promise<boolean> =>
  new Promise(resolve => Object.assign(dialogState,{visible:true,type:'confirm' as DialogType,title,message,confirmLabel,wide:previewItems.length>0,previewItems,onConfirm:()=>resolve(true),_onCancel:()=>resolve(false)}))
const closeDialog   = () => { if(dialogState.type==='confirm') dialogState._onCancel?.(); dialogState.visible=false }
const confirmDialog = () => { dialogState.onConfirm?.(); dialogState.visible=false }

// ============================================================
// GENERIC EXCEL FILTER ENGINE
// ============================================================
function createExcelFilter<K extends string>(keys: K[], sourceRef: () => any[]) {
  const activeDropdown = ref<K | null>(null)
  const colFilters = reactive<any>(Object.fromEntries(keys.map(k=>[k,[]])))
  const colSearch   = reactive<any>(Object.fromEntries(keys.map(k=>[k,''])))

  const toggleDropdown = (col: K) => { activeDropdown.value = activeDropdown.value===col ? null : col }
  const closeDropdowns = () => { activeDropdown.value = null }

  const getColUniqueValues = (col: K): string[] => {
    const raw = sourceRef().filter((r: any) => {
      return keys.every((c) => {
        if (c === col) return true;
        const active = colFilters[c];
        if (!active || !active.length) return true;
        const val = r[c];
        const isNull = val === null || val === undefined || val === '';
        if (active.includes('__NULL__') && isNull) return true;
        if (active.includes('-') && isNull) return true;
        if (isNull) return false;
        return active.includes(String(val));
      });
    });
    const set = new Set<string>();
    raw.forEach((r: any) => {
      const val = r[col];
      const strVal = (val === null || val === undefined || val === '') ? '-' : String(val);
      set.add(strVal);
    });
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }

  const getColOptions = (col: K): string[] => {
    const search = (colSearch[col]||'').toLowerCase()
    const vals = getColUniqueValues(col)
    if (!search) return vals
    return vals.filter(v => v.toLowerCase().includes(search))
  }

  const selectAllCol = (col: K) => {
    colFilters[col] = getColUniqueValues(col)
  }
  const clearColFilter = (col: K) => {
    colFilters[col] = []
  }
  const selectOnly = (col: K, val: string) => {
    colFilters[col] = [val]
  }

  const isColAllSelected = (col: K): boolean => { const opts=getColOptions(col); return opts.length>0&&opts.every(o=>colFilters[col].includes(o)) }
  const toggleColAll = (col: K) => { const opts=getColOptions(col); colFilters[col]=isColAllSelected(col)?[]:[...opts] }
  const invertColSelection = (col: K) => {
    const opts = getColUniqueValues(col)
    const active = colFilters[col] as string[]
    colFilters[col] = opts.filter(o => !active.includes(o))
  }
  const isAnyFilterActive = computed(() => keys.some(k=>colFilters[k].length>0))
  const resetFilters = () => { keys.forEach(k=>{colFilters[k]=[];colSearch[k]=''}) }

  const applyFilters = (list:any[]): any[] => list.filter(row=>keys.every(col=>{
    const active=colFilters[col]; if(!active.length) return true
    const val=row[col]; const isNull=val===null||val===undefined||val===''
    if(active.includes('-') && isNull) return true
    if(active.includes('__NULL__') && isNull) return true
    if(isNull) return false
    return active.includes(String(val))
  }))

  const getColOptionCount = (col: K, opt: string): number => {
    const raw = sourceRef().filter((r) => {
      return keys.every((c) => {
        if (c === col) return true;
        const active = colFilters[c];
        if (!active || !active.length) return true;
        const val = r[c];
        const isNull = val === null || val === undefined || val === '';
        if (active.includes('__NULL__') && isNull) return true;
        if (active.includes('-') && isNull) return true;
        if (isNull) return false;
        return active.includes(String(val));
      });
    });
    return raw.filter((r) => {
      const val = r[col];
      const strVal = (val === null || val === undefined || val === '') ? '-' : String(val);
      return strVal === opt;
    }).length;
  }

  const addSearchResultsToFilter = (col: K) => {
    const opts = getColOptions(col);
    const current = new Set(colFilters[col]);
    opts.forEach(o => current.add(o));
    colFilters[col] = Array.from(current);
  }

  return { activeDropdown, colFilters, colSearch, toggleDropdown, closeDropdowns, getColOptions, selectAllCol, clearColFilter, selectOnly, isColAllSelected, toggleColAll, invertColSelection, isAnyFilterActive, resetFilters, applyFilters, getColOptionCount, addSearchResultsToFilter }
}

// ============================================================
// MAIN TABLE — DATA & FILTER STATE
// ============================================================
const editableList = ref<any[]>([])

// ============================================================
// CELL & ROW COLOR PALETTE & STATE (EXCEL STYLE)
// ============================================================
const cellColors = ref<Record<string, Record<string, string>>>({})
const rowColors = ref<Record<string, string>>({})

const colorPalette = [
  { name: 'No Fill', value: '' },
  { name: 'Soft Yellow', value: '#fff2cc' },
  { name: 'Soft Green', value: '#e2efda' },
  { name: 'Soft Red', value: '#fce4d6' },
  { name: 'Soft Blue', value: '#ddebf7' },
  { name: 'Soft Purple', value: '#f3e8ff' },
  { name: 'Soft Orange', value: '#fde9d9' },
  { name: 'Soft Grey', value: '#f2f2f2' }
]

try {
  const savedCell = localStorage.getItem('mutation_cell_colors')
  if (savedCell) cellColors.value = JSON.parse(savedCell)
  const savedRow = localStorage.getItem('mutation_row_colors')
  if (savedRow) rowColors.value = JSON.parse(savedRow)
} catch (e) {
  console.error('Failed to load colors from localStorage', e)
}

const saveColors = () => {
  localStorage.setItem('mutation_cell_colors', JSON.stringify(cellColors.value))
  localStorage.setItem('mutation_row_colors', JSON.stringify(rowColors.value))
}

const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  rowId: null as string | null,
  colKey: null as string | null
})

// Drag / Keyboard Multi-selection State
const selectedCells = ref<Record<string, Record<string, boolean>>>({})
const isSelecting = ref(false)
const selectionStart = ref<{ rowKey: string; colKey: string; rowIndex: number; colIndex: number } | null>(null)

const columnsOrder = [
  'index', 'part_number', 'common_part', 'zrouting', 'job_number', 'project_id', 'DEST1', 'qty_kbn',
  'pcs_day_mdfo', 'pcs_today', 'pcs_tomorrow', 'pcs_day_adjust', 'stok_awal_tabungan', 'tabungan',
  'stok_awal', 'stock_weld_yesterday', 'stock_mgl', 'qty_in', 'qty_out', 'qty_calc_system', 'qty_final',
  'std_min', 'std_max', 'strength_calc_system', 'status_sys'
]

const getRowKey = (item: any): string => {
  return item.id ? String(item.id) : `${item.part_number || 'part'}_${item.job_number || ''}_${item.zrouting || ''}_${item.shift || ''}_${item.tanggal || ''}`
}

const getCellBgStyle = (item: any, colKey: string) => {
  const rKey = getRowKey(item)
  const cellColor = cellColors.value[rKey]?.[colKey]
  if (cellColor) {
    return { backgroundColor: cellColor }
  }
  const rowColor = rowColors.value[rKey]
  if (rowColor) {
    return { backgroundColor: rowColor }
  }
  return {}
}

const isCellSelected = (item: any, colKey: string): boolean => {
  const rKey = getRowKey(item)
  return !!selectedCells.value[rKey]?.[colKey]
}

const openContextMenu = (event: MouseEvent, item: any, colKey: string) => {
  contextMenu.value.show = true
  contextMenu.value.x = event.clientX
  contextMenu.value.y = event.clientY
  contextMenu.value.rowId = getRowKey(item)
  contextMenu.value.colKey = colKey
}

const toggleCellSelection = (rowKey: string, colKey: string) => {
  if (!selectedCells.value[rowKey]) {
    selectedCells.value[rowKey] = {}
  }
  selectedCells.value[rowKey][colKey] = !selectedCells.value[rowKey][colKey]
  if (!selectedCells.value[rowKey][colKey]) {
    delete selectedCells.value[rowKey][colKey]
    if (Object.keys(selectedCells.value[rowKey]).length === 0) {
      delete selectedCells.value[rowKey]
    }
  }
}

const selectCellSingle = (rowKey: string, colKey: string) => {
  selectedCells.value = {
    [rowKey]: { [colKey]: true }
  }
}

const clearSelection = () => {
  selectedCells.value = {}
}

const selectRange = (startRow: number, startCol: number, endRow: number, endCol: number) => {
  const minRow = Math.min(startRow, endRow)
  const maxRow = Math.max(startRow, endRow)
  const minCol = Math.min(startCol, endCol)
  const maxCol = Math.max(startCol, endCol)

  const newSelection: Record<string, Record<string, boolean>> = {}
  for (let r = minRow; r <= maxRow; r++) {
    const rowItem = filteredList.value[r]
    if (!rowItem) continue
    const rKey = getRowKey(rowItem)
    newSelection[rKey] = {}
    for (let c = minCol; c <= maxCol; c++) {
      const colKey = columnsOrder[c]
      newSelection[rKey][colKey] = true
    }
  }
  selectedCells.value = newSelection
}

const handleCellMouseDown = (event: MouseEvent, item: any, colKey: string, rowIndex: number) => {
  const rKey = getRowKey(item)
  if (event.button === 2) {
    if (selectedCells.value[rKey]?.[colKey]) {
      return
    }
    clearSelection()
    selectCellSingle(rKey, colKey)
    return
  }

  isSelecting.value = true
  const colIndex = columnsOrder.indexOf(colKey)
  selectionStart.value = { rowKey: rKey, colKey, rowIndex, colIndex }

  if (event.ctrlKey || event.metaKey) {
    toggleCellSelection(rKey, colKey)
  } else if (event.shiftKey && selectionStart.value) {
    selectRange(selectionStart.value.rowIndex, selectionStart.value.colIndex, rowIndex, colIndex)
  } else {
    clearSelection()
    selectCellSingle(rKey, colKey)
  }
}

const handleCellMouseEnter = (event: MouseEvent, item: any, colKey: string, rowIndex: number) => {
  if (!isSelecting.value || !selectionStart.value) return
  const colIndex = columnsOrder.indexOf(colKey)
  selectRange(selectionStart.value.rowIndex, selectionStart.value.colIndex, rowIndex, colIndex)
}

const handleMouseUp = () => {
  isSelecting.value = false
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    clearSelection()
  }
}

const applyColor = (target: 'cell' | 'row', color: string) => {
  const rKey = contextMenu.value.rowId
  const cKey = contextMenu.value.colKey
  if (!rKey) return

  const isPartofSelection = !!selectedCells.value[rKey]?.[cKey || '']

  if (target === 'cell') {
    if (isPartofSelection) {
      for (const rowKey in selectedCells.value) {
        if (!cellColors.value[rowKey]) {
          cellColors.value[rowKey] = {}
        }
        for (const colKey in selectedCells.value[rowKey]) {
          if (!color) {
            delete cellColors.value[rowKey][colKey]
          } else {
            cellColors.value[rowKey][colKey] = color
          }
        }
        if (Object.keys(cellColors.value[rowKey]).length === 0) {
          delete cellColors.value[rowKey]
        }
      }
    } else {
      if (!cKey) return
      if (!cellColors.value[rKey]) {
        cellColors.value[rKey] = {}
      }
      if (!color) {
        delete cellColors.value[rKey][cKey]
        if (Object.keys(cellColors.value[rKey]).length === 0) {
          delete cellColors.value[rKey]
        }
      } else {
        cellColors.value[rKey][cKey] = color
      }
    }
  } else {
    if (isPartofSelection) {
      for (const rowKey in selectedCells.value) {
        if (!color) {
          delete rowColors.value[rowKey]
        } else {
          rowColors.value[rowKey] = color
        }
      }
    } else {
      if (!color) {
        delete rowColors.value[rKey]
      } else {
        rowColors.value[rKey] = color
      }
    }
  }
  saveColors()
  closeContextMenu()
}

const handleClearAllColors = () => {
  if (confirm('Apakah Anda yakin ingin menghapus semua warna sel dan baris?')) {
    cellColors.value = {}
    rowColors.value = {}
    saveColors()
  }
  closeContextMenu()
}

const colColorFilters = ref<Record<string, string>>({})

const getColorsInColumn = (colKey: string): string[] => {
  const colors = new Set<string>()
  editableList.value.forEach(item => {
    const rKey = getRowKey(item)
    const cellColor = cellColors.value[rKey]?.[colKey]
    if (cellColor) {
      colors.add(cellColor)
    } else {
      const rowColor = rowColors.value[rKey]
      if (rowColor) {
        colors.add(rowColor)
      }
    }
  })
  return Array.from(colors)
}

const setColColorFilter = (colKey: string, color: string) => {
  if (!color) {
    delete colColorFilters.value[colKey]
  } else {
    colColorFilters.value[colKey] = color
  }
  closeMainDropdowns()
}

const ColorFilter = (props: { colKey: string }) => {
  const colors = getColorsInColumn(props.colKey)
  if (colors.length === 0) return null

  return h('div', {
    class: 'px-2.5 py-1.5 border-b border-gray-100 flex flex-col gap-1 bg-gray-50/50'
  }, [
    h('div', { class: 'text-[9px] font-bold text-gray-500' }, 'Filter Warna:'),
    h('div', { class: 'flex flex-wrap gap-1' }, [
      h('button', {
        onClick: () => setColColorFilter(props.colKey, ''),
        class: 'w-4 h-4 rounded border flex items-center justify-center text-red-500 font-bold text-[8px] bg-white cursor-pointer hover:bg-red-50',
        title: 'Clear Color Filter'
      }, '✕'),
      ...colors.map(cVal => {
        const isActive = colColorFilters.value[props.colKey] === cVal
        return h('button', {
          key: cVal,
          onClick: () => setColColorFilter(props.colKey, cVal),
          class: `w-4 h-4 rounded border cursor-pointer transition-transform hover:scale-110 ${isActive ? 'ring-1 ring-blue-500 border-blue-500' : 'border-gray-300'}`,
          style: { backgroundColor: cVal }
        })
      })
    ])
  ])
}

const closeContextMenu = () => {
  contextMenu.value.show = false
}

onMounted(() => {
  window.addEventListener('click', closeContextMenu)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('click', closeContextMenu)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('keydown', handleKeyDown)
})

type MainColKey = 'tanggal'|'shift'|'DEST1'|'project_id'|'part_number'|'common_part'|'job_number'|'zrouting'|
                  'stok_awal'|'qty_in'|'qty_out'|'qty_calc_system'|'tabungan'|'stok_awal_tabungan'|'qty_final'|'stok_akhir'|'stock_weld_yesterday'|'stock_mgl'|
                  'pcs_day_mdfo'|'pcs_today'|'pcs_tomorrow'|'pcs_day_adjust'|'std_min'|'std_max'|'status_sys'|'strength_calc_system'|'strength_system'|'qty_kbn'

const mainKeys: MainColKey[] = ['DEST1','qty_kbn','project_id','part_number','common_part','job_number','zrouting','pcs_day_mdfo','pcs_today','pcs_tomorrow','pcs_day_adjust','stok_awal_tabungan','tabungan','stok_awal','stock_weld_yesterday','stock_mgl','qty_in','qty_out','qty_calc_system','qty_final','stok_akhir','std_min','std_max','status_sys','strength_calc_system','strength_system']
const mainFilter = createExcelFilter<MainColKey>(mainKeys, () => editableList.value.map(item=>({
  ...item,
  pcs_day_mdfo: item.pcs_day_mdfo_roundedkanban_stocks_table,
  pcs_tomorrow: item.pcs_tomorrow,
  qty_kbn: item.qty_kbn,
  status_sys: item.status,
  common_part: item.is_common ? 'COMMON' : '-',
  stok_akhir: item.stok_akhir,
  strength_system: item.strength_system
})))
const { activeDropdown:mainActiveDropdown, colFilters:mainColFilters, colSearch:mainColSearch, toggleDropdown:toggleMainDropdown, closeDropdowns:closeMainDropdowns, getColOptions:getMainColOptions, selectAllCol:selectAllMain, clearColFilter:clearMain, selectOnly:selectMainOnly, isColAllSelected:isMainColAllSelected, toggleColAll:toggleMainColAll, invertColSelection:invertMainColSelection, isAnyFilterActive:isMainAnyFilterActiveBase, resetFilters:resetMainColFilters, applyFilters:applyMainFilters, getColOptionCount:getMainColOptionCount, addSearchResultsToFilter:addSearchMain } = mainFilter

// ===== DATE RANGE FILTER =====
const mainDateFilter = reactive({ start: '', end: '' })

const uniqueDates = computed(() => {
  const raw = editableList.value.map(r => r.tanggal).filter(Boolean)
  return [...new Set(raw)].sort()
})

const isDateInRange = (d: string): boolean => {
  return mainDateFilter.start === d
}

const toggleSingleDate = (d: string) => {
  if (mainDateFilter.start === d) {
    mainDateFilter.start = ''
  } else {
    mainDateFilter.start = d
  }
  mainDateFilter.end = ''
}

const setDateQuick = (type: 'today') => {
  const today = getTodayDateString()
  if (type === 'today') {
    mainDateFilter.start = today
    mainDateFilter.end = ''
  }
}
const clearDateFilter = () => { mainDateFilter.start = ''; mainDateFilter.end = '' }

const isMainAnyFilterActive = computed(() => isMainAnyFilterActiveBase.value || !!mainDateFilter.start || Object.keys(colColorFilters.value).length > 0)

const resetMainFilters = () => {
  resetMainColFilters()
  mainDateFilter.start = ''
  mainDateFilter.end = ''
  selectedShiftVal.value = ''
  mainSortField.value = ''
  mainSortOrder.value = 'asc'
  colColorFilters.value = {}
}

// ===== SORT =====
const mainSortField = ref<string>('')
const mainSortOrder = ref<'asc'|'desc'>('asc')

const setMainSort = (field: string, forceOrder?: 'asc'|'desc') => {
  if (forceOrder) {
    mainSortField.value = field
    mainSortOrder.value = forceOrder
  } else {
    if (mainSortField.value === field) {
      mainSortOrder.value = mainSortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      mainSortField.value = field
      mainSortOrder.value = 'asc'
    }
  }
}

// ===== COMPUTED FILTERED + SORTED LIST =====
const filteredList = computed(() => {
  if (isEditMode.value && frozenIds.value !== null) {
    const list = editableList.value
    const map = new Map(list.map(item => [item.id, item]))
    return frozenIds.value.map(id => map.get(id)).filter(Boolean)
  }

  let res = editableList.value

  res = applyMainFilters(res)

  // Filter by column-specific color highlights (AND combination)
  for (const colKey in colColorFilters.value) {
    const filterColor = colColorFilters.value[colKey]
    if (filterColor) {
      res = res.filter(item => {
        const rKey = getRowKey(item)
        const cellCol = cellColors.value[rKey]?.[colKey]
        if (cellCol) return cellCol === filterColor
        const rCol = rowColors.value[rKey]
        return rCol === filterColor
      })
    }
  }

  if (mainSortField.value) {
    const field = mainSortField.value
    const order = mainSortOrder.value
    res = [...res].sort((a, b) => {
      let vA = a[field] ?? ''; let vB = b[field] ?? ''
      const nA = Number(vA); const nB = Number(vB)
      if (!isNaN(nA) && !isNaN(nB)) { return order==='asc' ? nA-nB : nB-nA }
      vA = String(vA).toLowerCase(); vB = String(vB).toLowerCase()
      if (vA < vB) return order==='asc' ? -1 : 1
      if (vA > vB) return order==='asc' ? 1 : -1
      return 0
    })
  }

  return res
})

// ============================================================
// SO TABLE FILTER
// ============================================================
type SoColKey = 'action'|'status'|'vbelv'|'bismt'|'matnr'|'bstdk'|'kwmeng'|'rfmng'|'qty_out'|'erdat'|'erzet'|'vbeln'|'vsnmr_v'
const soKeys: SoColKey[] = ['action','status','vbelv','bismt','matnr','bstdk','kwmeng','rfmng','qty_out','erdat','erzet','vbeln','vsnmr_v']
const displaySoList = ref<any[]>([])
const soFilter = createExcelFilter<SoColKey>(soKeys, () => displaySoList.value)
const { activeDropdown:soActiveDropdown, colFilters:soColFilters, colSearch:soColSearch, toggleDropdown:toggleSoColDropdown, closeDropdowns:closeSoColDropdowns, getColOptions:getSoColOptions, isColAllSelected:isSoColAllSelected, toggleColAll:toggleSoColAll, isAnyFilterActive:isSoAnyFilterActive, resetFilters:resetSoFilters, applyFilters:applySoFilters } = soFilter
const isErzetInTimeRange = (erzet: string | null | undefined, start: string, end: string): boolean => {
  if (!erzet) return false
  const cleanErzet = String(erzet).replace(/\D/g, '').substring(0, 4)
  if (cleanErzet.length < 4) return false
  const cleanStart = start.replace(':', '')
  const cleanEnd = end.replace(':', '')
  return cleanErzet >= cleanStart && cleanErzet <= cleanEnd
}

const getNextDaySapDate = (dateStr: string): string => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return ''
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10) - 1
  const d = parseInt(parts[2], 10)
  const dateObj = new Date(y, m, d)
  dateObj.setDate(dateObj.getDate() + 1)
  const nextY = dateObj.getFullYear()
  const nextM = String(dateObj.getMonth() + 1).padStart(2, '0')
  const nextD = String(dateObj.getDate()).padStart(2, '0')
  return `${nextY}${nextM}${nextD}`
}

const getNextDayDisplayDate = (dateStr: string): string => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return ''
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10) - 1
  const d = parseInt(parts[2], 10)
  const dateObj = new Date(y, m, d)
  dateObj.setDate(dateObj.getDate() + 1)
  const nextY = dateObj.getFullYear()
  const nextM = String(dateObj.getMonth() + 1).padStart(2, '0')
  const nextD = String(dateObj.getDate()).padStart(2, '0')
  return `${nextD}/${nextM}/${nextY}`
}

const createdOnFilter = reactive({
  mode: 'AUTO',
  enableDate: false,
  date: '',
  enableTime: false,
  startTime: '00:00',
  endTime: '23:59'
})

const filterAdvanceOnly = ref(false)

const isAdvanceDelivery = (so: any): boolean => {
  if (!so.bstdk || !so.erdat) return false
  
  // Normalize bstdk (PO Date)
  const cleanBstdk = String(so.bstdk).replace(/\D/g, '')
  if (cleanBstdk.length !== 8) return false
  
  // Normalize erdat (Created On)
  const cleanErdat = String(so.erdat).replace(/\D/g, '')
  if (cleanErdat.length !== 8) return false

  // Jika erdat bernilai 00000000 (00/00/0000), berarti belum di-DO dan bukan advance
  if (Number(cleanErdat) === 0) return false
  
  // Compare: if Created On is before PO Date (CleanErdat < CleanBstdk)
  return Number(cleanErdat) < Number(cleanBstdk)
}

const advanceDeliveries = computed(() => {
  return displaySoList.value.filter(so => isAdvanceDelivery(so))
})

const totalAdvanceQtyOut = computed(() => {
  return advanceDeliveries.value.reduce((sum, so) => sum + (Number(so.qty_out) || 0), 0)
})


const soFilteredList = computed(() => {
  const filtered = applySoFilters(displaySoList.value)
  if (filterAdvanceOnly.value) {
    return filtered.filter(so => isAdvanceDelivery(so))
  }
  return filtered
})
const soFilteredTotalQtyOut = computed(() => soFilteredList.value.reduce((s:number,r:any)=>s+(Number(r.qty_out)||0),0))

const formatSapDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-'
  const clean = String(dateStr).replace(/\D/g, '')
  if (clean.length !== 8) return dateStr
  const y = clean.substring(0, 4)
  const m = clean.substring(4, 6)
  const d = clean.substring(6, 8)
  return `${d}/${m}/${y}`
}

const formatSapTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '-'
  const clean = String(timeStr).replace(/\D/g, '')
  if (clean.length !== 6) return timeStr
  const hh = clean.substring(0, 2)
  const mm = clean.substring(2, 4)
  const ss = clean.substring(4, 6)
  return `${hh}:${mm}:${ss}`
}

// ============================================================
// UI STATE
// ============================================================
const isEditMode = ref(false)
const frozenIds = ref<string[] | null>(null)
const isSaving   = ref(false)
const isAutoFillTabungan = ref(false)
const isAutoFillPcs      = ref(false)
const isAutoFillMgl      = ref(false)
const isAutoFillWeld     = ref(false)
const isManualAdjustmentMode = ref(false)
const selectedShiftVal   = ref('')

// ============================================================
// SO DO MODAL STATE
// ============================================================
const showSoDoModal       = ref(false)
const isLoadingCombined   = ref(false)
const isSyncingFromSap     = ref(false)
const isUpdatingEtdLocal  = ref(false)
const isSavingQtyLocal    = ref(false)
const combinedSalesOrders = ref<any[]>([])
const originalCombinedSalesOrders = ref<any[]>([])

const getEditedItems = (): any[] => {
  return combinedSalesOrders.value.filter(item => {
    const original = originalCombinedSalesOrders.value.find(o => o.id === item.id)
    if (!original) return false
    return (item.vsnmr_v || '') !== (original.vsnmr_v || '') || (item.status || '') !== (original.status || '')
  })
}
const syncTimeRange       = ref({ start:'07:00', end:'18:00', allHours: false })
const soDoParams          = reactive({ date: getTodayDateString(), shift: store.filters.shift || '1' })
const countNullCycledelv  = computed(() => combinedSalesOrders.value.filter(item=>!item.vsnmr_v).length)

const openSoDoModal = () => { 
  soDoParams.shift = store.filters.shift || '1'
  showSoDoModal.value=true 
}

const handleSyncSoDoFromSap = async () => {
  if (!soDoParams.date) {
    await showAlert('warning', 'Tanggal Belum Dipilih', 'Harap tentukan tanggal penarikan terlebih dahulu.')
    return
  }
  isSyncingFromSap.value = true
  try {
    const res = await store.fetchSalesOrderDoByDate(soDoParams.date, '', 'sync')
    if (res.status) {
      await showAlert('success', 'Sync Berhasil', res.message || 'Sinkronisasi data dari SAP berhasil dijalankan.')
    } else {
      await showAlert('error', 'Sync Gagal', res.message || 'Gagal sinkronisasi data dari SAP.')
    }
  } catch (err: any) {
    console.error('Error in handleSyncSoDoFromSap:', err)
    await showAlert('error', 'Terjadi Kesalahan', 'Gagal menghubungi server untuk sinkronisasi SAP.')
  } finally {
    isSyncingFromSap.value = false
  }
}
const closeSoDoModal = () => {
  showSoDoModal.value=false; combinedSalesOrders.value=[]; displaySoList.value=[]; resetSoFilters()
  store.clearSalesOrderData(); handleFetch()
  syncTimeRange.value = { start:'07:00', end:'18:00', allHours: false }
  filterAdvanceOnly.value = false
  createdOnFilter.mode = 'AUTO'
  createdOnFilter.enableDate = false
  createdOnFilter.date = getTodayDateString()
  createdOnFilter.enableTime = false
  createdOnFilter.startTime = '00:00'
  createdOnFilter.endTime = '23:59'
}

// ============================================================
// UPLOAD EXCEL MGL STATE & ACTIONS
// ============================================================
const showUploadExcelModal = ref(false)
const uploadFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadExcelParams = reactive({
  date: '',
  shift: '1',
  isUploading: false,
  type_upload: ''
})

const openUploadExcelModal = () => {
  const now = new Date()
  const hour = now.getHours()
  
  if (hour < 10) {
    const yesterday = new Date()
    yesterday.setDate(now.getDate() - 1)
    uploadExcelParams.date = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    uploadExcelParams.shift = '2'
  } else {
    uploadExcelParams.date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    uploadExcelParams.shift = '1'
  }
  
  uploadExcelParams.type_upload = ''
  uploadFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
  showUploadExcelModal.value = true
}

const closeUploadExcelModal = () => {
  if (uploadExcelParams.isUploading) return
  showUploadExcelModal.value = false
}

// ============================================================
// EXPORT QTY IN STATE & ACTIONS
// ============================================================
const showExportQtyInModal = ref(false)
const isExportingQtyIn = ref(false)
const exportQtyInParams = reactive({
  date: ''
})

const getQtyInDefaultDate = (): string => {
  const today = new Date()
  const hours = today.getHours()
  const minutes = today.getMinutes()
  
  // Rule: jika tgl 13 agustus hingga jam 09.00 pagi set default ke hari sebelumnya.
  // We make it general for any day before 09:00 AM.
  const isBeforeNineAM = (hours < 9) || (hours === 9 && minutes === 0)
  
  if (isBeforeNineAM) {
    today.setDate(today.getDate() - 1)
  }
  
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

const openExportQtyInModal = () => {
  exportQtyInParams.date = getQtyInDefaultDate()
  isExportingQtyIn.value = false
  showExportQtyInModal.value = true
}

const closeExportQtyInModal = () => {
  if (isExportingQtyIn.value) return
  showExportQtyInModal.value = false
}

const submitExportQtyIn = async () => {
  if (!exportQtyInParams.date) {
    await showAlert('warning', 'Tanggal Kosong', 'Silakan pilih tanggal terlebih dahulu.')
    return
  }

  isExportingQtyIn.value = true
  try {
    const url = `http://192.168.10.67/majsf_rest_api/api/achievement_report/excel?date=${exportQtyInParams.date}`
    const response = await axios.get(url, {
      responseType: 'blob'
    })

    const blob = new Blob([response.data], { type: response.headers['content-type'] })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)

    const contentDisposition = response.headers['content-disposition']
    let fileName = `Achievement Produksi ${exportQtyInParams.date}.xlsx`
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = fileNameMatch[1]
      }
    }

    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showExportQtyInModal.value = false
  } catch (error) {
    console.error('Error exporting QTY In:', error)
    await showAlert('error', 'Gagal Ekspor', 'Terjadi kesalahan saat mengunduh file QTY In.')
  } finally {
    isExportingQtyIn.value = false
  }
}

// ============================================================
// EXPORT EXCEL MUTASI STATE & ACTIONS
// ============================================================
const showExportModal = ref(false)
const isExporting = ref(false)
const exportParams = reactive({
  date: getTodayDateString(),
  shift: '1'
})

const uploadedTemplateName = ref('')
const isUploadingTemplate = ref(false)

const onCustomTemplateChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    
    isUploadingTemplate.value = true
    try {
      const formData = new FormData()
      formData.append('file_template', file)

      const res = await axios.post(`http://192.168.10.67/majsf_rest_api/api/mutation_ifp/upload_template`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (res.data && res.data.success) {
        uploadedTemplateName.value = file.name
        await showAlert('success', 'Berhasil Unggah', 'Template Excel berhasil diunggah dan diperbarui di server.')
      } else {
        await showAlert('error', 'Gagal Unggah', res.data?.message || 'Gagal menyimpan file template di server.')
        uploadedTemplateName.value = ''
      }
    } catch (err) {
      console.error('Error uploading template:', err)
      await showAlert('error', 'Gagal Unggah', 'Terjadi kesalahan saat mengunggah file template ke server.')
      uploadedTemplateName.value = ''
    } finally {
      isUploadingTemplate.value = false
      target.value = '' // Clear file input value to allow uploading the same file again
    }
  }
}

const clearCustomTemplate = () => {
  uploadedTemplateName.value = ''
}

const openExportModal = () => {
  exportParams.date = getTodayDateString()
  exportParams.shift = '1'
  uploadedTemplateName.value = ''
  isUploadingTemplate.value = false
  showExportModal.value = true
}

const closeExportModal = () => {
  if (isExporting.value || isUploadingTemplate.value) return
  uploadedTemplateName.value = ''
  isUploadingTemplate.value = false
  showExportModal.value = false
}

const submitExportExcel = async () => {
  if (!exportParams.date) {
    await showAlert('warning', 'Tanggal Kosong', 'Silakan pilih tanggal terlebih dahulu.')
    return
  }
  if (!exportParams.shift) {
    await showAlert('warning', 'Shift Kosong', 'Silakan pilih shift terlebih dahulu.')
    return
  }

  isExporting.value = true
  try {
    const url = `http://192.168.10.67/majsf_rest_api/api/mutation_ifp/template?tanggal=${exportParams.date}&shift=${exportParams.shift}`
    const response = await axios.get(url, {
      responseType: 'blob'
    })

    const blob = new Blob([response.data], { type: response.headers['content-type'] })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)

    const contentDisposition = response.headers['content-disposition']
    let fileName = `Template_Mutasi_${exportParams.date}_Shift_${exportParams.shift}.xlsx`
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = fileNameMatch[1]
      }
    }

    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showExportModal.value = false
  } catch (error) {
    console.error('Error exporting excel:', error)
    await showAlert('error', 'Gagal Ekspor', 'Terjadi kesalahan saat mengunduh file template Excel.')
  } finally {
    isExporting.value = false
  }
}

const exportFilteredToExcel = () => {
  if (filteredList.value.length === 0) {
    showAlert('warning', 'Tidak Ada Data', 'Tidak ada data untuk diekspor.')
    return
  }

  const headers = [
    'No', 'Part Number', 'Part Name', 'Common Part', 'Routing', 'Job Number', 
    'Project ID', 'DEST1', 'Qty Kbn', 'Pcs/Day MDFO', 'Pcs Today', 'PCS Delv H+1', 
    'Pcs Day Adjust', 'Stok Awal + Tabungan', 'Tabungan', 'Stok Awal', 
    'Stock Weld Yesterday', 'Stock MGL', 'Qty In', 'Qty Out', 
    'Qty Calc System', 'Qty Final', 'Stok Akhir', 'Std Min', 'Std Max', 
    'Status System', 'Strength Calc System', 'Strength System'
  ]

  const data = filteredList.value.map((item, index) => [
    index + 1,
    item.part_number || '',
    item.MAKTX || '',
    item.common_part || '-',
    item.zrouting || '',
    item.job_number || '',
    item.project_id || '',
    item.DEST1 || '',
    item.qty_kbn ?? 0,
    item.pcs_day_mdfo_roundedkanban_stocks_table ?? 0,
    item.pcs_today ?? 0,
    item.pcs_tomorrow ?? 0,
    item.pcs_day_adjust ?? '',
    item.stok_awal_tabungan ?? 0,
    item.tabungan ?? 0,
    item.stok_awal ?? 0,
    item.stock_weld_yesterday ?? 0,
    item.stock_mgl ?? 0,
    item.qty_in ?? 0,
    item.qty_out ?? 0,
    item.qty_calc_system ?? 0,
    item.qty_final ?? 0,
    item.stok_akhir ?? 0,
    item.std_min ?? 0,
    item.std_max ?? 0,
    item.status_sys || '-',
    item.strength_calc_system ?? 0,
    item.strength_system ?? 0
  ])

  const worksheetData = [headers, ...data]
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mutasi Terfilter')

  const dateStr = store.filters.tanggal || getTodayDateString()
  const fileName = `Mutasi_Terfilter_${dateStr}_Shift_${store.filters.shift || '1'}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

const onExcelFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    uploadFile.value = target.files[0]
  }
}

const submitUploadExcel = async () => {
  if (!uploadExcelParams.date) {
    await showAlert('warning', 'Tanggal Kosong', 'Silakan pilih tanggal terlebih dahulu.')
    return
  }
  if (!uploadExcelParams.shift) {
    await showAlert('warning', 'Shift Kosong', 'Silakan pilih shift terlebih dahulu.')
    return
  }
  if (!uploadFile.value) {
    await showAlert('warning', 'File Kosong', 'Silakan pilih file Excel terlebih dahulu.')
    return
  }

  uploadExcelParams.isUploading = true
  try {
    const updatedBy = authStore.user?.username || 'Efrino'
    const result = await store.importExcelMgl(
      uploadFile.value,
      uploadExcelParams.date,
      uploadExcelParams.shift,
      updatedBy,
      uploadExcelParams.type_upload
    )

    if (result.success) {
      await showAlert('success', 'Berhasil', result.message || 'File Excel berhasil diproses.')
      showUploadExcelModal.value = false
      await handleFetch()
    } else {
      await showAlert('error', 'Gagal', result.message || 'Gagal memproses file Excel.')
    }
  } catch (error: any) {
    const errMsg = error?.response?.data?.message || error?.message || 'Terjadi kesalahan saat mengunggah file.'
    await showAlert('error', 'Gagal', errMsg)
  } finally {
    uploadExcelParams.isUploading = false
  }
}

const handleFetchCombinedSoDo = async () => {
  if (!soDoParams.date) { await showAlert('warning','Tanggal Belum Dipilih','Harap tentukan tanggal penarikan terlebih dahulu.'); return }
  isLoadingCombined.value=true; resetSoFilters()
  try {
    const res = await store.fetchSalesOrderDoByDate(soDoParams.date, '', 'db')
    const map = new Map<number, any>()
    ;(res?.data || []).forEach((item: any) => {
      if (item.id) {
        const normItem = { ...item }
        normItem.erdat = normItem.erdat || normItem.ERDAT || ''
        normItem.erzet = normItem.erzet || normItem.ERZET || ''
        map.set(item.id, normItem)
      }
    })
    const rawList = Array.from(map.values())

    // Group items by Sales Order position key (vbelv + posnr + matnr)
    const groups = new Map<string, any[]>()
    rawList.forEach((item: any) => {
      const vbelv = String(item.vbelv || '').trim()
      const matnr = String(item.matnr || '').trim()
      const posnr = String(item.posnr || '').trim()
      const key = `${vbelv}_${matnr}_${posnr}`

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(item)
    })

    // Process each SO position group:
    // 1. Separate DO rows (with VBELN) vs Open SO rows (without VBELN)
    // 2. Sum up total DO delivered quantity
    // 3. Keep all unique DO rows (setting KWMENG = 0 on secondary rows)
    // 4. Only include Open SO row if total DO delivered < KWMENG, capping open SO qty to remaining balance
    const processedList: any[] = []
    groups.forEach((groupItems) => {
      const doRows = groupItems.filter(r => !!r.vbeln && String(r.vbeln).trim() !== '' && String(r.vbeln).trim() !== 'null')
      const openSoRows = groupItems.filter(r => !r.vbeln || String(r.vbeln).trim() === '' || String(r.vbeln).trim() === 'null')

      // Deduplicate DO rows by VBELN + POSNN/POSNR
      const uniqueDoMap = new Map<string, any>()
      doRows.forEach(r => {
        const doKey = `${r.vbeln}_${r.posnn || r.posnr || ''}`
        if (!uniqueDoMap.has(doKey)) {
          uniqueDoMap.set(doKey, r)
        }
      })
      const uniqueDoRows = Array.from(uniqueDoMap.values())

      const totalDoDelivered = uniqueDoRows.reduce((sum, r) => sum + (Number(r.rfmng) || 0), 0)
      const soOrderQty = Number(groupItems[0]?.kwmeng) || 0
      const remainingOpenQty = Math.max(0, soOrderQty - totalDoDelivered)

      uniqueDoRows.forEach((item, index) => {
        processedList.push({
          ...item,
          kwmeng: index === 0 ? String(soOrderQty) : '0'
        })
      })

      if (remainingOpenQty > 0 && openSoRows.length > 0) {
        const openItem = openSoRows[0]
        processedList.push({
          ...openItem,
          kwmeng: uniqueDoRows.length === 0 ? String(soOrderQty) : '0',
          qty_out: String(remainingOpenQty),
          rfmng: '0'
        })
      }
    })

    combinedSalesOrders.value = processedList
    originalCombinedSalesOrders.value = JSON.parse(JSON.stringify(processedList))
    displaySoList.value = [...processedList].sort((a, b) => {
      const aEmpty = !a.vsnmr_v || String(a.vsnmr_v).trim() === ''
      const bEmpty = !b.vsnmr_v || String(b.vsnmr_v).trim() === ''
      if (aEmpty && !bEmpty) return -1
      if (!aEmpty && bEmpty) return 1
      return 0
    })
    createdOnFilter.date = soDoParams.date

    if (displaySoList.value.length === 0) {
      await showAlert('info', 'Tidak Ditemukan', 'Tidak ditemukan berkas DO yang cocok dengan kriteria tampilan pada tanggal ini.')
    }
  } catch (err: any) {
    console.error('Error in handleFetchCombinedSoDo:', err)
    await showAlert('error', 'Terjadi Kesalahan', 'Terjadi kesalahan saat memproses data gabungan.')
  } finally {
    isLoadingCombined.value = false
  }
}

const handleApplySingleCombinedEtd = async (soItem:any) => {
  if(!soItem.vsnmr_v){await showAlert('warning','Jam Belum Diisi','Isi siklus jam pengiriman (Cycle Delv) terlebih dahulu.');return}
  isUpdatingEtdLocal.value=true
  try {
    const response=await store.updateSalesOrderEtdByDate({
      id:soItem.id,
      vbeln:soItem.vbeln,
      vbelv:soItem.vbelv,
      posnr:soItem.posnr,
      cycledelv:soItem.vsnmr_v || '',
      status:soItem.status || ''
    })
    if(response?.status){
      await showAlert('success','Berhasil Dikunci','Data berhasil diperbarui!')
      const target=displaySoList.value.find(item=>item.id===soItem.id)
      if(target) {
        target.vsnmr_v=soItem.vsnmr_v
        target.status=soItem.status
        
        const origTarget = originalCombinedSalesOrders.value.find(item=>item.id===soItem.id)
        if(origTarget) {
          origTarget.vsnmr_v=soItem.vsnmr_v
          origTarget.status=soItem.status
        }

        displaySoList.value.sort((a, b) => {
          const aEmpty = !a.vsnmr_v || String(a.vsnmr_v).trim() === ''
          const bEmpty = !b.vsnmr_v || String(b.vsnmr_v).trim() === ''
          if (aEmpty && !bEmpty) return -1
          if (!aEmpty && bEmpty) return 1
          return 0
        })
      }
    } else await showAlert('error','Gagal Memperbarui','Gagal memperbarui data: '+(response?.message||'Respon server tidak valid'))
  } catch { await showAlert('error','Kesalahan Koneksi','Sistem mendeteksi kegagalan koneksi jaringan.')
  } finally { isUpdatingEtdLocal.value=false }
}

const handleSaveAllCombinedChanges = async () => {
  const editedItems = getEditedItems()
  if (editedItems.length === 0) return

  const confirmResult = await showConfirm(
    'Konfirmasi',
    `Apakah Anda yakin ingin menyimpan perubahan pada ${editedItems.length} baris data?`
  )
  if (!confirmResult) return

  isUpdatingEtdLocal.value = true
  try {
    const promises = editedItems.map(item => {
      return store.updateSalesOrderEtdByDate({
        id: item.id,
        vbeln: item.vbeln,
        vbelv: item.vbelv,
        posnr: item.posnr,
        cycledelv: item.vsnmr_v || '',
        status: item.status || ''
      })
    })

    const results = await Promise.all(promises)
    const failedCount = results.filter(res => !res?.status).length

    if (failedCount === 0) {
      await showAlert('success', 'Berhasil', 'Semua perubahan berhasil disimpan!')
      await handleFetchCombinedSoDo()
    } else {
      await showAlert('warning', 'Penyimpanan Selesai', `${results.length - failedCount} berhasil disimpan, ${failedCount} gagal.`)
      await handleFetchCombinedSoDo()
    }
  } catch (err: any) {
    console.error('Error in handleSaveAllCombinedChanges:', err)
    await showAlert('error', 'Terjadi Kesalahan', 'Gagal menghubungi server untuk menyimpan data.')
  } finally {
    isUpdatingEtdLocal.value = false
  }
}



const getDisplayType = (so: any) => {
  if (so.status === 'BSTDK') return 'PODATE'
  if (so.status === 'ERDAT') return 'CREATEDON'
  return so.action || ''
}

const getItemsInTimeRange = (): any[] => {
  let list = soFilteredList.value

  if (syncTimeRange.value.allHours) {
    return list.filter((item: any) => `${!!item.vsnmr_v}`)
  }
  const {start,end}=syncTimeRange.value; if(!start||!end) return []
  return list.filter((item:any)=>{if(!item.vsnmr_v)return false;const t=item.vsnmr_v.substring(0,5);return t>=start&&t<=end})
}

const showSyncConfirmModal = ref(false)
const syncConfirmItems = ref<any[]>([])
const syncConfirmFilter = createExcelFilter<SoColKey>(soKeys, () => syncConfirmItems.value)
const syncConfirmFilteredList = computed(() => syncConfirmFilter.applyFilters(syncConfirmItems.value))

const closeSyncConfirmModal = () => {
  showSyncConfirmModal.value = false
  syncConfirmItems.value = []
  syncConfirmFilter.resetFilters()
}

const getExportFileName = (tanggalDataStr: string) => {
  const dateStr = tanggalDataStr || getTodayDateString()
  let tanggalDataFormatted = ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    tanggalDataFormatted = `${parts[2]}.${parts[1]}.${parts[0]}`
  } else {
    tanggalDataFormatted = dateStr
  }

  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  const jamTarik = `${hours}.${minutes}`
  const tanggalTarik = `${day}.${month}.${year}`

  return `ZDNDO ${tanggalDataFormatted} per ${jamTarik} ${tanggalTarik}.xlsx`
}

const exportSyncConfirmToExcel = () => {
  if (syncConfirmFilteredList.value.length === 0) return;
  const start_hour = syncTimeRange.value.allHours ? '00:00' : syncTimeRange.value.start;
  const end_hour = syncTimeRange.value.allHours ? '23:59' : syncTimeRange.value.end;
  const url = `http://192.168.10.67/majsf_rest_api/api/mutation_ifp/sales_order_do_export?date=${soDoParams.date}&action=ALL&start_hour=${start_hour}&end_hour=${end_hour}`;
  window.location.href = url;
}

const executeSyncToMovement = async () => {
  if (store.filters.tanggal !== soDoParams.date) {
    await showAlert('warning', 'Tanggal Tidak Sesuai', `Tanggal SO (${soDoParams.date}) harus sama dengan Tanggal Mutasi (${store.filters.tanggal || '-'}) untuk menyimpan ke mutasi.`);
    return;
  }
  isSavingQtyLocal.value = true
  try {
    const start_hour = syncTimeRange.value.allHours ? '00:00' : syncTimeRange.value.start
    const end_hour = syncTimeRange.value.allHours ? '23:59' : syncTimeRange.value.end
    const response = await store.syncSalesOrderQtyToMovement({ start_hour, end_hour, items: displaySoList.value })
    if (response?.status) {
      await showAlert('success', 'Sinkronisasi Berhasil', `Berhasil menyinkronkan data mutasi sebanyak ${response.updated_count} kelompok unik.`)
      closeSyncConfirmModal()
      closeSoDoModal()
    } else {
      await showAlert('error', 'Gagal Sinkronisasi', 'Gagal sinkronisasi data: ' + (response?.message || 'Error internal server.'))
    }
  } catch {
    await showAlert('error', 'Kesalahan Jaringan', 'Terjadi kesalahan jaringan atau endpoint backend tidak mengenali format data.')
  } finally {
    isSavingQtyLocal.value = false
  }
}

const handleSaveQtyToMovement = async () => {
  if(displaySoList.value.length===0) return
  if(!syncTimeRange.value.allHours && (!syncTimeRange.value.start||!syncTimeRange.value.end)){
    await showAlert('warning','Filter Jam Kosong','Harap tentukan rentang jam filter sinkronisasi terlebih dahulu.');
    return
  }
  const itemsInRange=getItemsInTimeRange()
  if(itemsInRange.length===0){
    const msg = syncTimeRange.value.allHours 
      ? 'Tidak ditemukan baris dengan Cycle Delv yang terisi.'
      : `Tidak ditemukan baris dengan Cycle Delv antara jam ${syncTimeRange.value.start} s/d ${syncTimeRange.value.end}.`;
    await showAlert('info','Tidak Ada Data', msg);
    return
  }
  
  syncConfirmItems.value = itemsInRange
  syncConfirmFilter.resetFilters()
  showSyncConfirmModal.value = true
}

const exportSoToExcel = async () => {
  if (soFilteredList.value.length === 0) return;

  // Urutkan per Type & Tanggal seperti di PHP backend
  const sortedRows = [...soFilteredList.value].sort((a, b) => {
    const typeCompare = String(a.action || '').localeCompare(String(b.action || ''))
    if (typeCompare !== 0) return typeCompare
    const dtA = (a.erdat || '') + (a.erzet || '')
    const dtB = (b.erdat || '') + (b.erzet || '')
    return dtA.localeCompare(dtB)
  })

  const wb = new ExcelJS.Workbook()
  
  // ==========================================================
  // 1. DETAIL SHEET
  // ==========================================================
  const sheet = wb.addWorksheet('Detail')

  const headers = [
    'No',
    'Type',
    'SO Number',
    'Job Number',
    'Part Number',
    'PO Date',
    'Qty Sales Order',
    'Qty DO',
    'Qty Out',
    'Create DO',
    'Time DO',
    'DO Number',
    'Cycle Delv'
  ]

  sheet.addRow(headers)
  
  // Header Style
  const headerStyle: any = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' } // biru tua
    },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }
  }

  sheet.getRow(1).height = 22
  for (let c = 1; c <= 13; c++) {
    sheet.getCell(1, c).style = headerStyle
  }

  let totalQtySO = 0
  let totalQtyDO = 0
  let totalQtyOut = 0

  sortedRows.forEach((r, idx) => {
    const no = idx + 1
    const po_date_fmt = formatSapDate(r.bstdk)
    const do_date_fmt = formatSapDate(r.erdat)
    const time_do_fmt = formatSapTime(r.erzet)

    const qtySO_val  = Number(r.kwmeng) || 0
    const qtyDO_val  = Number(r.rfmng) || 0
    const qtyOut_val = Number(r.qty_out) || 0

    totalQtySO += qtySO_val
    totalQtyDO += qtyDO_val
    totalQtyOut += qtyOut_val

    const rowData = [
      no,
      r.action || '',
      r.vbelv || '',
      r.bismt || '',
      r.matnr || '',
      po_date_fmt,
      qtySO_val,
      qtyDO_val,
      qtyOut_val,
      do_date_fmt,
      time_do_fmt,
      r.vbeln || '',
      r.vsnmr_v || ''
    ]

    const row = sheet.addRow(rowData)
    
    // Default border for all cells in this data row
    for (let c = 1; c <= 13; c++) {
      const cell = row.getCell(c)
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
      }
      cell.alignment = { vertical: 'middle' }
    }

    // Zebra striping
    if (no % 2 === 0) {
      for (let c = 1; c <= 13; c++) {
        row.getCell(c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        }
      }
    }

    // Type coloring (Column 2)
    const typeCell = row.getCell(2)
    const typeColor = (String(r.action).toUpperCase() === 'PODATE') ? 'FFDDEBF7' : 'FFE2EFDA'
    typeCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: typeColor }
    }
    typeCell.font = { bold: true }

    // Highlight abnormal
    if (Number(r.is_abnormal_vsnmr) === 1) {
      for (let c = 1; c <= 13; c++) {
        const cell = row.getCell(c)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC7CE' }
        }
        cell.font = {
          color: { argb: 'FF9C0006' }
        }
      }
    }

    // Alignments
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' }

    // Qty formatting
    for (let c = 7; c <= 9; c++) {
      row.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell(c).numFmt = '#,##0'
    }
  })

  // Add Total Row for Detail Sheet
  const totalRowIdx = sheet.lastRow!.number + 1
  sheet.mergeCells(totalRowIdx, 1, totalRowIdx, 6)
  sheet.getCell(totalRowIdx, 1).value = 'TOTAL:'
  sheet.getCell(totalRowIdx, 7).value = totalQtySO
  sheet.getCell(totalRowIdx, 8).value = totalQtyDO
  sheet.getCell(totalRowIdx, 9).value = totalQtyOut

  // Style Total Row
  const totalRow = sheet.getRow(totalRowIdx)
  totalRow.height = 20
  for (let c = 1; c <= 13; c++) {
    const cell = totalRow.getCell(c)
    cell.font = { bold: true, size: 10 }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAEAEA' }
    }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'double', color: { argb: 'FF000000' } }
    }
    if (c >= 1 && c <= 6) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' }
    } else if (c >= 7 && c <= 9) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' }
      cell.numFmt = '#,##0'
    }
  }

  // Freeze Pane and Auto Filter
  sheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 0, topLeftCell: 'A2', activePane: 'bottomRight' } as any]
  if (totalRowIdx >= 2) {
    sheet.autoFilter = `A1:M${totalRowIdx}`
  }

  // Auto Widths Detail
  sheet.columns.forEach(column => {
    let maxLength = 0
    ;(column as any).eachCell({ includeEmpty: true }, (cell: any) => {
      const valStr = cell.value ? String(cell.value) : ''
      if (valStr.length > maxLength) {
        maxLength = valStr.length
      }
    })
    column.width = maxLength < 10 ? 10 : maxLength + 2
  })

  // ==========================================================
  // 2. SUMMARY SHEET (Pivot per Part Number)
  // ==========================================================
  const summarySheet = wb.addWorksheet('Summary')

  const summaryHeaders = ['No', 'Part Number', 'Job Number', 'Total Qty Sales Order', 'Total Qty DO', 'Total Qty Out', 'Jumlah Item Delivery']
  summarySheet.addRow(summaryHeaders)

  // Style Header
  summarySheet.getRow(1).height = 22
  for (let c = 1; c <= 7; c++) {
    summarySheet.getCell(1, c).style = headerStyle
  }

  // Grouping
  const pivot = new Map<string, any>()
  sortedRows.forEach(r => {
    const key = `${r.matnr}|${r.bismt}`
    if (!pivot.has(key)) {
      pivot.set(key, {
        matnr: r.matnr,
        bismt: r.bismt,
        so_qty: 0,
        do_qty: 0,
        out_qty: 0,
        count: 0
      })
    }
    const item = pivot.get(key)
    item.so_qty += Number(r.kwmeng) || 0
    item.do_qty += Number(r.rfmng) || 0
    item.out_qty += Number(r.qty_out) || 0
    item.count++
  })
  const summaryList = Array.from(pivot.values())

  let sumTotalSO = 0
  let sumTotalDO = 0
  let sumTotalOut = 0
  let sumCount = 0

  summaryList.forEach((p, idx) => {
    const no = idx + 1
    sumTotalSO += p.so_qty
    sumTotalDO += p.do_qty
    sumTotalOut += p.out_qty
    sumCount += p.count

    const rowData = [
      no,
      p.matnr || '',
      p.bismt || '',
      p.so_qty,
      p.do_qty,
      p.out_qty,
      p.count
    ]

    const row = summarySheet.addRow(rowData)

    // Border and Zebra Striping
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c)
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
      }
      cell.alignment = { vertical: 'middle' }
      if (no % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        }
      }
    }

    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    for (let c = 4; c <= 7; c++) {
      row.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell(c).numFmt = '#,##0'
    }
  })

  // Summary Total Row
  const sTotalRowIdx = summarySheet.lastRow!.number + 1
  summarySheet.mergeCells(sTotalRowIdx, 1, sTotalRowIdx, 3)
  summarySheet.getCell(sTotalRowIdx, 1).value = 'TOTAL:'
  summarySheet.getCell(sTotalRowIdx, 4).value = sumTotalSO
  summarySheet.getCell(sTotalRowIdx, 5).value = sumTotalDO
  summarySheet.getCell(sTotalRowIdx, 6).value = sumTotalOut
  summarySheet.getCell(sTotalRowIdx, 7).value = sumCount

  const sTotalRow = summarySheet.getRow(sTotalRowIdx)
  sTotalRow.height = 20
  for (let c = 1; c <= 7; c++) {
    const cell = sTotalRow.getCell(c)
    cell.font = { bold: true, size: 10 }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAEAEA' }
    }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'double', color: { argb: 'FF000000' } }
    }
    if (c >= 1 && c <= 3) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' }
    } else if (c >= 4 && c <= 7) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' }
      cell.numFmt = '#,##0'
    }
  }

  // Freeze summary Sheet
  summarySheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 0, topLeftCell: 'A2', activePane: 'bottomRight' } as any]
  if (sTotalRowIdx >= 2) {
    summarySheet.autoFilter = `A1:G${sTotalRowIdx}`
  }

  // Auto Widths Summary
  summarySheet.columns.forEach(column => {
    let maxLength = 0
    ;(column as any).eachCell({ includeEmpty: true }, (cell: any) => {
      const valStr = cell.value ? String(cell.value) : ''
      if (valStr.length > maxLength) {
        maxLength = valStr.length
      }
    })
    column.width = maxLength < 10 ? 10 : maxLength + 2
  })

  // ==========================================================
  // 3. DOWNLOAD FILE
  // ==========================================================
  const formatNumber2Digit = (num: number) => String(num).padStart(2, '0')
  const now = new Date()
  const tgl_tarik = `${formatNumber2Digit(now.getDate())}.${formatNumber2Digit(now.getMonth() + 1)}.${now.getFullYear()}`
  const jam_tarik = `${formatNumber2Digit(now.getHours())}.${formatNumber2Digit(now.getMinutes())}`

  let tgl_data_formatted = ''
  if (soDoParams.date) {
    const parts = soDoParams.date.split('-')
    if (parts.length === 3) {
      tgl_data_formatted = `${parts[2]}.${parts[1]}.${parts[0]}`
    } else {
      tgl_data_formatted = soDoParams.date
    }
  } else {
    tgl_data_formatted = tgl_tarik
  }

  const filename = `ZDNDO ${tgl_data_formatted} per ${jam_tarik} ${tgl_tarik}.xlsx`

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, filename)
}


// ============================================================
// STORE SYNC
// ============================================================
watch(()=>store.mutations,(newVal)=>{if(!isEditMode.value)syncStoreToLocal(newVal)},{deep:true})

watch(
  () => [mainDateFilter.start, selectedShiftVal.value],
  async ([newDate, newShift]) => {
    const selectedDate = (newDate as string) || ''
    const selectedShift = (newShift as string) || ''

    if (selectedDate !== store.filters.tanggal || selectedShift !== store.filters.shift) {
      store.setFilters({
        tanggal: selectedDate,
        shift: selectedShift
      })
      await handleFetch()
    }
  }
)

onMounted(() => {
  if (!store.filters.tanggal) {
    store.setFilters({ tanggal: getTodayDateString() })
  }
  handleFetch()
})

const mapMutationItem = (item: any, index: number = 0) => {
  const stok_awal = toNumberSafe(item.stok_awal)
  const tabungan  = toNumberSafe(item.tabungan)
  const stok_awal_tabungan = stok_awal + tabungan

  const qty_in       = toNumberSafe(item.qty_in)
  const qty_out      = toNumberSafe(item.qty_out)
  const pcs_today    = toNumberSafe(item.pcs_today)
  const pcs_tomorrow = toNumberSafe(item.pcs_tomorrow)
  const stock_weld_yesterday = toNumberSafe(item.stock_weld_yesterday)
  const stock_mgl    = toNumberSafe(item.stock_mgl)
  const qty_kbn      = item.qty_kbn !== null && item.qty_kbn !== undefined ? toNumberSafe(item.qty_kbn) : null

  const qty_calc_system = item.qty_calc_system !== undefined && item.qty_calc_system !== null
    ? Math.round(toNumberSafe(item.qty_calc_system))
    : Math.round(stok_awal + qty_in - qty_out)
  const qty_final = item.qty_final !== undefined && item.qty_final !== null
    ? Math.round(toNumberSafe(item.qty_final))
    : qty_calc_system

  const std_min = toNumberSafe(item.std_min)
  const std_max = toNumberSafe(item.std_max)

  const pcs_day_adjust = (item.pcs_day_adjust !== null && item.pcs_day_adjust !== undefined && item.pcs_day_adjust !== '')
    ? toNumberSafe(item.pcs_day_adjust)
    : null

  const pcs_sys = toNumberSafe(item.pcs_day_mdfo_roundedkanban_stocks_table)
  const active_pcs = (pcs_day_adjust !== null) ? pcs_day_adjust : pcs_sys

  const strength_calc_system = item.strength_calc_system !== undefined && item.strength_calc_system !== null
    ? Math.round(toNumberSafe(item.strength_calc_system))
    : (active_pcs > 0 ? Math.round(qty_final / (active_pcs / 16)) : 0)
  const status = active_pcs > 0 ? calcStatus(strength_calc_system, std_min, std_max) : (item.status || '-')

  const baseId = item.id ?? item.id_mutation ?? `${item.part_number || 'part'}_${item.job_number || ''}_${item.zrouting || ''}_${item.shift || ''}_${item.tanggal || ''}`;
  const uniqueId = `${baseId}_idx_${index}`;

  const mapped = {
    ...item,
    id: uniqueId,
    db_id: item.id,
    stok_awal, qty_in, qty_out, 
    tabungan,
    stok_awal_tabungan,
    pcs_today,
    pcs_tomorrow,
    stock_weld_yesterday,
    stock_mgl,
    qty_kbn,
    
    qty_suggest_for_qty_calc_system_min: toNumberSafe(item.qty_suggest_for_qty_calc_system_min),
    qty_suggest_for_qty_calc_system_max: toNumberSafe(item.qty_suggest_for_qty_calc_system_max),
    pcs_day_calc_suggest_qty_calc_system_min: toNumberSafe(item.pcs_day_calc_suggest_qty_calc_system_min),
    pcs_day_calc_suggest_qty_calc_system_max: toNumberSafe(item.pcs_day_calc_suggest_qty_calc_system_max),
    pcs_day_calc_suggest_qty_adjustment: toNumberSafe(item.pcs_day_calc_suggest_qty_adjustment),

    qty_calc_system,
    qty_final,
    stok_akhir: qty_final,
    std_min,
    std_max,
    strength_calc_system,
    strength_system: strength_calc_system,
    status, 
    pcs_day_mdfo_roundedkanban_stocks_table: pcs_sys,
    pcs_day_adjust,
    pcs_day_mdfo: pcs_sys,
    status_sys: status,
    common_part: item.is_common ? 'COMMON' : '-',
  }
  calcSafeSuggestions(mapped)
  return mapped
}

const syncStoreToLocal = (rawResponse: any) => {
  let list: any[] = [];
  if (rawResponse && Array.isArray(rawResponse.data)) {
    list = rawResponse.data;
  } else if (Array.isArray(rawResponse)) {
    list = rawResponse;
  } else {
    editableList.value = [];
    return;
  }

  const seen = new Set<string>();
  const dedupedList: any[] = [];

  list.forEach(item => {
    const key = item.id
      ? String(item.id)
      : `${item.part_number || ''}_${item.job_number || ''}_${item.zrouting || ''}_${item.shift || ''}_${item.tanggal || ''}_${item.source || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedupedList.push(item);
    }
  });

  editableList.value = dedupedList.map((item: any, idx: number) => mapMutationItem(item, idx));
  updateCommonPartGroupings()
}

const getBasePartNumber = (partNo: string) => {
  if (!partNo) return ''
  const parts = partNo.trim().split('-')
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`
  }
  return partNo.trim()
}

const updateCommonPartGroupings = () => {
  const groupCounts: Record<string, number> = {}
  editableList.value.forEach(item => {
    const base = getBasePartNumber(item.part_number)
    if (base) {
      groupCounts[base] = (groupCounts[base] || 0) + 1
    }
  })

  editableList.value.forEach(item => {
    const base = getBasePartNumber(item.part_number)
    const count = base ? groupCounts[base] || 0 : 0
    if (count > 1) {
      item.is_common = true
      item.common_base = base
      item.common_count = count
      item.common_part = 'COMMON'
    } else {
      item.is_common = false
      item.common_base = base
      item.common_count = 1
      item.common_part = '-'
    }
  })
}



const handleFetch = async () => {
  store.isLoading = true;
  try {
    const url = 'http://192.168.10.67/majsf_rest_api/api/mutation_ifp/mutation';
    const response = await axios.get(url, {
      params: {
        tanggal: store.filters.tanggal || '',
        shift: store.filters.shift || '1',
        source: store.filters.source || '',
        part_number: store.filters.part_number || ''
      }
    });
    if (response.data && response.data.success) {
      store.mutations = response.data.data;
      store.totalData = response.data.total;
    } else {
      store.mutations = [];
      store.totalData = 0;
    }
    syncStoreToLocal(store.mutations);
  } catch (error) {
    console.error('Error fetching stock mutation:', error);
    store.mutations = [];
    store.totalData = 0;
  } finally {
    store.isLoading = false;
  }
}
const isSyncStokAwalDisabledTime = computed(() => {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  // Disable dari 06:00 pagi hingga 09:00 pagi (hours: 6, 7, 8, dan tepat 9:00)
  const isTimeRange = (hours >= 6 && hours < 9) || (hours === 9 && minutes === 0)
  return isTimeRange
})
const isSyncingStockAwal = ref(false)
const handleSyncStockAwal = async () => {
  isSyncingStockAwal.value = true;
  try {
    const url = 'http://192.168.10.67/majsf_rest_api/api/Mutation_ifp/sync_stock_awal';
    const response = await axios.get(url);
    if (response.data && (response.data.success !== false && response.data.status !== false)) {
      await showAlert('success', 'Sync Berhasil', response.data?.message || 'Sinkronisasi stok awal berhasil.');
      await handleFetch(); // reload data
    } else {
      await showAlert('error', 'Sync Gagal', response.data?.message || 'Gagal sinkronisasi stok awal.');
    }
  } catch (err: any) {
    const errMsg = err?.response?.data?.message || err?.message || 'Terjadi kesalahan jaringan atau server.';
    await showAlert('error', 'Sync Gagal', errMsg);
  } finally {
    isSyncingStockAwal.value = false;
  }
}

const isSyncingStock = ref(false)
const handleSyncStockMovement = async () => {
  if (!store.filters.tanggal) {
    await showAlert('warning', 'Tanggal Kosong', 'Silakan pilih tanggal terlebih dahulu sebelum melakukan penarikan data.');
    return;
  }
  isSyncingStock.value = true;
  try {
    const url = 'http://192.168.10.67/majsf_rest_api/api/achievement_report/sync_stock_movement';
    const response = await axios.get(url, { params: { date: store.filters.tanggal } });
    if (response.data && (response.data.success !== false && response.data.status !== false)) {
      await showAlert('success', 'Tarik Data Berhasil', response.data?.message || 'Sinkronisasi pergerakan stok berhasil.');
      await handleFetch(); // reload data
    } else {
      await showAlert('error', 'Tarik Data Gagal', response.data?.message || 'Gagal sinkronisasi pergerakan stok.');
    }
  } catch (err: any) {
    await showAlert('error', 'Tarik Data Gagal', err.message || 'Terjadi kesalahan jaringan atau server.');
  } finally {
    isSyncingStock.value = false;
  }
}
const enableEditMode = () => {
  frozenIds.value = filteredList.value.map(item => item.id)
  isEditMode.value = true
  updateCommonPartGroupings()
  editableList.value.forEach(row => {
    if (row.original_stok_awal === undefined) row.original_stok_awal = row.stok_awal
    if (row.original_tabungan === undefined) row.original_tabungan = row.tabungan
    calcSafeSuggestions(row)
  })
}
const cancelEditMode  = () => { isEditMode.value=false; frozenIds.value = null; isAutoFillTabungan.value=false; isAutoFillPcs.value=false; isAutoFillMgl.value=false; isAutoFillWeld.value=false; isManualAdjustmentMode.value=false; syncStoreToLocal(store.mutations) }

// ============================================================
// LOGIKA INPUT EDIT: PERTAHANKAN STATUS BAWAAN DATABASE JIKA DATA KOSONG
// ============================================================
const calcSafeSuggestions = (row: any) => {
  const std_min = toNumberSafe(row.std_min) || 16
  const std_max = toNumberSafe(row.std_max) || 20
  const pcs_adj = toNumberSafe(row.pcs_day_adjust)
  const pcs_sys = toNumberSafe(row.pcs_day_mdfo_roundedkanban_stocks_table)
  const active_pcs = pcs_adj > 0 ? pcs_adj : pcs_sys

  if (active_pcs <= 0) {
    row.suggest_transfer_qty = 0
    row.suggest_transfer_type = null
    return
  }

  const factor = active_pcs / 16
  const qty_final = toNumberSafe(row.stok_akhir)
  const effective_status = row.status

  if (effective_status === 'KRITIS') {
    const target_min = Math.ceil(std_min * factor)
    const deficit = target_min - qty_final
    if (deficit > 0) {
      row.suggest_transfer_qty = deficit
      row.suggest_transfer_type = 'TO_STOK_AWAL'
    } else {
      row.suggest_transfer_qty = 0
      row.suggest_transfer_type = null
    }
  } else if (effective_status === 'OVER') {
    const target_max = Math.floor(std_max * factor)
    const excess = qty_final - target_max
    if (excess > 0) {
      row.suggest_transfer_qty = excess
      row.suggest_transfer_type = 'TO_TABUNGAN'
    } else {
      row.suggest_transfer_qty = 0
      row.suggest_transfer_type = null
    }
  } else {
    row.suggest_transfer_qty = 0
    row.suggest_transfer_type = null
  }
}

const applySafeSuggestion = (row: any) => {
  calcSafeSuggestions(row)
  if (!row.suggest_transfer_type || row.suggest_transfer_qty <= 0) return

  if (row.original_stok_awal === undefined) row.original_stok_awal = row.stok_awal
  if (row.original_tabungan === undefined) row.original_tabungan = row.tabungan

  const qty = row.suggest_transfer_qty

  if (row.suggest_transfer_type === 'TO_STOK_AWAL') {
    row.stok_awal = toNumberSafe(row.stok_awal) + qty
    row.tabungan = toNumberSafe(row.tabungan) - qty
  } else if (row.suggest_transfer_type === 'TO_TABUNGAN') {
    row.stok_awal = toNumberSafe(row.stok_awal) - qty
    row.tabungan = toNumberSafe(row.tabungan) + qty
  }

  findAndCalculateRow(row, 'stok_awal')
}

const resetStokAwalTabungan = (row: any) => {
  if (row.original_stok_awal !== undefined) {
    row.stok_awal = row.original_stok_awal
    row.original_stok_awal = undefined
  }
  if (row.original_tabungan !== undefined) {
    row.tabungan = row.original_tabungan
    row.original_tabungan = undefined
  }
  findAndCalculateRow(row, 'stok_awal')
}

const findAndCalculateRow = (rowOrId: any, triggerField: 'stok_awal' | 'tabungan' | 'pcs_day_adjust' = 'stok_awal') => {
  const row = (typeof rowOrId === 'object' && rowOrId !== null)
    ? rowOrId
    : editableList.value.find(r => String(r.id) === String(rowOrId))

  if (!row) return

  if (row.original_stok_awal === undefined) row.original_stok_awal = row.stok_awal
  if (row.original_tabungan === undefined) row.original_tabungan = row.tabungan

  if (!isManualAdjustmentMode.value) {
    const orig_awal = toNumberSafe(row.original_stok_awal)
    const orig_tab  = toNumberSafe(row.original_tabungan)

    if (triggerField === 'stok_awal') {
      const current_awal = toNumberSafe(row.stok_awal)
      const diff = current_awal - orig_awal
      row.tabungan = orig_tab - diff
    } else if (triggerField === 'tabungan') {
      const current_tab = toNumberSafe(row.tabungan)
      const diff = current_tab - orig_tab
      row.stok_awal = orig_awal - diff
    }
  } else {
    if (triggerField === 'stok_awal') {
      row.original_stok_awal = row.stok_awal
    } else if (triggerField === 'tabungan') {
      row.original_tabungan = row.tabungan
    }
  }

  const awal   = toNumberSafe(row.stok_awal)
  const tab    = toNumberSafe(row.tabungan)
  const masuk  = toNumberSafe(row.qty_in)
  const keluar = toNumberSafe(row.qty_out)

  row.stok_awal_tabungan = awal + tab
  row.qty_calc_system    = awal + masuk - keluar
  row.qty_final          = row.qty_calc_system
  row.stok_akhir         = row.qty_final

  const std_min = toNumberSafe(row.std_min)
  const std_max = toNumberSafe(row.std_max)
  const pcs_sys = toNumberSafe(row.pcs_day_mdfo_roundedkanban_stocks_table)

  const has_adj = (row.pcs_day_adjust !== null && row.pcs_day_adjust !== undefined && row.pcs_day_adjust !== '')
  const pcs_adj = has_adj ? toNumberSafe(row.pcs_day_adjust) : null
  const active_pcs = (pcs_adj !== null) ? pcs_adj : pcs_sys;

  if (active_pcs > 0) {
    row.strength_calc_system = Math.round(row.qty_final / (active_pcs / 16))
    row.strength_system      = row.strength_calc_system
    row.status               = calcStatus(row.strength_calc_system, std_min, std_max)
  } else {
    row.strength_calc_system = 0
    row.strength_system      = 0
    row.status               = '-'
  }

  row.pcs_day_mdfo = pcs_sys
  row.status_sys = row.status
  row.common_part = row.is_common ? 'COMMON' : '-'

  calcSafeSuggestions(row)
  updateCommonPartGroupings()
}

const toggleManualAdjustmentMode = () => {
  isManualAdjustmentMode.value = !isManualAdjustmentMode.value
}

const toggleAutoFillTabungan = () => {
  isAutoFillTabungan.value = !isAutoFillTabungan.value
  if (isAutoFillTabungan.value) {
    filteredList.value.forEach(row => {
      const current_status = row.status
      if (current_status === 'KRITIS' || current_status === 'OVER') {
        applySafeSuggestion(row)
      }
    })
  } else {
    filteredList.value.forEach(row => {
      resetStokAwalTabungan(row)
    })
  }
  updateCommonPartGroupings()
  editableList.value = [...editableList.value]
}

const toggleAutoFillPcs = () => {
  isAutoFillPcs.value = !isAutoFillPcs.value
  if (isAutoFillPcs.value) {
    filteredList.value.forEach(row => {
      const current_status = row.status
      if (current_status === 'KRITIS' || current_status === 'OVER') {
        const pcs_day_val = toNumberSafe(row.pcs_day_mdfo_roundedkanban_stocks_table)
        const pcs_today_val = toNumberSafe(row.pcs_today)
        const choice_pcs = (pcs_day_val === 0 || pcs_today_val === 0) ? 0 : Math.min(pcs_day_val, pcs_today_val)

        if (row.original_pcs === undefined) {
          row.original_pcs = row.pcs_day_adjust;
        }
        row.pcs_day_adjust = choice_pcs;
        findAndCalculateRow(row, 'pcs_day_adjust');
      }
    })
  } else {
    filteredList.value.forEach(row => {
      if (row.original_pcs !== undefined) {
        row.pcs_day_adjust = row.original_pcs;
        row.original_pcs = undefined;
      }
      findAndCalculateRow(row, 'pcs_day_adjust');
    })
  }
  updateCommonPartGroupings()
  editableList.value = [...editableList.value]
}

const toggleAutoFillMgl = () => {
  isAutoFillMgl.value = !isAutoFillMgl.value
  
  const excludedRoutes = [
    'PRESS TBN - IFPD',
    'WSS - IFPD',
    'S/A - IFPD'
  ].map(r => r.toUpperCase().trim())

  if (isAutoFillMgl.value) {
    filteredList.value.forEach(row => {
      const routeVal = String(row.zrouting || '').toUpperCase().trim()
      if (excludedRoutes.includes(routeVal)) return

      if (row.mgl_original_stok_awal === undefined) row.mgl_original_stok_awal = row.stok_awal
      if (row.mgl_original_tabungan === undefined) row.mgl_original_tabungan = row.tabungan

      const target_mgl = toNumberSafe(row.stock_mgl)
      const qty_in = toNumberSafe(row.qty_in)
      const qty_out = toNumberSafe(row.qty_out)

      // Default: stok_akhir = target_mgl, tabungan = 0
      let temp_stok_awal = target_mgl - qty_in + qty_out
      let temp_tabungan = 0

      // Check if it causes OVER status
      const std_min = toNumberSafe(row.std_min)
      const std_max = toNumberSafe(row.std_max)
      const pcs_sys = toNumberSafe(row.pcs_day_mdfo_roundedkanban_stocks_table)
      const pcs_adj = (row.pcs_day_adjust !== null && row.pcs_day_adjust !== undefined && row.pcs_day_adjust !== '') ? toNumberSafe(row.pcs_day_adjust) : null
      const active_pcs = (pcs_adj !== null) ? pcs_adj : pcs_sys

      if (active_pcs > 0) {
        // stok_akhir is exactly target_mgl under the initial calculation
        const potential_stok_akhir = target_mgl
        const potential_strength = Math.round(potential_stok_akhir / (active_pcs / 16))

        if (potential_strength > std_max) {
          const max_stok_akhir = Math.floor((std_max + 0.49) * (active_pcs / 16))
          const excess = potential_stok_akhir - max_stok_akhir
          
          if (excess > 0) {
            temp_stok_awal = Math.max(0, max_stok_akhir - qty_in + qty_out)
            temp_tabungan = target_mgl - max_stok_akhir
          }
        }
      }

      row.stok_awal = temp_stok_awal
      row.tabungan = temp_tabungan
      
      row.original_stok_awal = row.stok_awal
      row.original_tabungan = row.tabungan

      findAndCalculateRow(row, 'pcs_day_adjust')
    })
  } else {
    filteredList.value.forEach(row => {
      const routeVal = String(row.zrouting || '').toUpperCase().trim()
      if (excludedRoutes.includes(routeVal)) return

      if (row.mgl_original_stok_awal !== undefined) {
        row.stok_awal = row.mgl_original_stok_awal
        row.mgl_original_stok_awal = undefined
      }
      if (row.mgl_original_tabungan !== undefined) {
        row.tabungan = row.mgl_original_tabungan
        row.mgl_original_tabungan = undefined
      }
      row.original_stok_awal = undefined
      row.original_tabungan = undefined
      findAndCalculateRow(row, 'pcs_day_adjust')
    })
  }
  updateCommonPartGroupings()
  editableList.value = [...editableList.value]
}

const toggleAutoFillWeld = () => {
  isAutoFillWeld.value = !isAutoFillWeld.value
  
  const targetRoutes = [
    'WSS - IFPD',
    'S/A - IFPD'
  ].map(r => r.toUpperCase().trim())

  if (isAutoFillWeld.value) {
    filteredList.value.forEach(row => {
      const routeVal = String(row.zrouting || '').toUpperCase().trim()
      if (!targetRoutes.includes(routeVal)) return

      // Keep original values
      if (row.weld_original_stok_awal === undefined) row.weld_original_stok_awal = row.stok_awal
      if (row.weld_original_tabungan === undefined) row.weld_original_tabungan = row.tabungan

      const stock_weld = toNumberSafe(row.stock_weld_yesterday)
      const qty_in = toNumberSafe(row.qty_in)
      const qty_out = toNumberSafe(row.qty_out)

      // Initially set stok_awal = stock_weld, tabungan = 0
      let temp_stok_awal = stock_weld
      let temp_tabungan = 0

      // Calculate potential stok_akhir with these values
      const potential_stok_akhir = temp_stok_awal + qty_in - qty_out

      const std_min = toNumberSafe(row.std_min)
      const std_max = toNumberSafe(row.std_max)
      const pcs_sys = toNumberSafe(row.pcs_day_mdfo_roundedkanban_stocks_table)
      const pcs_adj = (row.pcs_day_adjust !== null && row.pcs_day_adjust !== undefined && row.pcs_day_adjust !== '') ? toNumberSafe(row.pcs_day_adjust) : null
      const active_pcs = (pcs_adj !== null) ? pcs_adj : pcs_sys

      if (active_pcs > 0) {
        const potential_strength = Math.round(potential_stok_akhir / (active_pcs / 16))
        
        // If status is OVER, move excess to tabungan
        if (potential_strength > std_max) {
          const max_stok_akhir = Math.floor((std_max + 0.49) * (active_pcs / 16))
          const excess = potential_stok_akhir - max_stok_akhir
          
          if (excess > 0) {
            temp_stok_awal = Math.max(0, stock_weld - excess)
            temp_tabungan = stock_weld - temp_stok_awal
          }
        }
      }

      row.stok_awal = temp_stok_awal
      row.tabungan = temp_tabungan

      row.original_stok_awal = row.stok_awal
      row.original_tabungan = row.tabungan

      findAndCalculateRow(row, 'pcs_day_adjust')
    })
  } else {
    filteredList.value.forEach(row => {
      const routeVal = String(row.zrouting || '').toUpperCase().trim()
      if (!targetRoutes.includes(routeVal)) return

      if (row.weld_original_stok_awal !== undefined) {
        row.stok_awal = row.weld_original_stok_awal
        row.weld_original_stok_awal = undefined
      }
      if (row.weld_original_tabungan !== undefined) {
        row.tabungan = row.weld_original_tabungan
        row.weld_original_tabungan = undefined
      }
      row.original_stok_awal = undefined
      row.original_tabungan = undefined
      findAndCalculateRow(row, 'pcs_day_adjust')
    })
  }
  updateCommonPartGroupings()
  editableList.value = [...editableList.value]
}

const handleSaveBulk = async () => {
  isSaving.value = true
  try {
    const listToSave = isEditMode.value && editableList.value.length > 0
      ? editableList.value
      : (filteredList.value && filteredList.value.length > 0 ? filteredList.value : store.mutations)

    if (!listToSave || listToSave.length === 0) {
      await showAlert('warning', 'Tidak Ada Data', 'Tidak ada data mutasi yang dapat disimpan.')
      return
    }

    const res = await store.updateMutations(listToSave)
    if (res?.success) {
      isEditMode.value = false;
      frozenIds.value = null;
      isAutoFillTabungan.value = false;
      isAutoFillPcs.value = false;
      isAutoFillMgl.value = false;
      isAutoFillWeld.value = false;
      isManualAdjustmentMode.value = false;
      await handleFetch()
      await showAlert('success', 'Data Berhasil Diperbarui', res.message || `${listToSave.length} data mutasi sukses diperbarui!`)
    } else {
      await showAlert('error', 'Gagal Menyimpan', res?.message || 'Sistem gagal melakukan penyimpanan massal.')
    }
  } catch (err: any) {
    console.error('Error in handleSaveBulk:', err)
    await showAlert('error', 'Gagal Menyimpan', err?.message || 'Sistem gagal melakukan penyimpanan massal.')
  } finally {
    isSaving.value = false
  }
}

const countByStatus = (fieldKey:'status'|'status_adjust', status:string) => filteredList.value.filter((r:any)=>r[fieldKey]===status).length
const statusChipClass = (status:string) => {
  const base='status-chip'
  if(status==='SAFE')   return `${base} status-safe`
  if(status==='KRITIS') return `${base} status-kritis`
  if(status==='OVER')   return `${base} status-over`
  return base
}
const handleRadioChange = (item: any, type: 'pcs', value: any) => {
  const numVal = toNumberSafe(value);
  if (item.original_pcs === undefined) item.original_pcs = item.pcs_day_adjust;
  item.pcs_day_adjust = numVal;
  findAndCalculateRow(item, 'pcs_day_adjust');
};

const resetValue = (item: any, type: 'pcs') => {
  if (item.original_pcs !== undefined) {
    item.pcs_day_adjust = item.original_pcs;
  }
  findAndCalculateRow(item, 'pcs_day_adjust');
};
// ============================================================
// PLANNING SEGMENT LOGIC
// ============================================================
const planningList = ref<any[]>([])
const isPlanningLoading = ref(false)
const planningFilter = reactive({ tanggal: getTodayDateString(), shift: '1' })

const fetchPlanning = async () => {
  if (!planningFilter.tanggal) {
    await showAlert('warning', 'Peringatan', 'Silakan isi Tanggal terlebih dahulu.');
    return;
  }
  isPlanningLoading.value = true;
  try {
    const res = await axios.get('http://192.168.10.67/majsf_rest_api/api/mutation_ifp/planning', {
      params: { tanggal: planningFilter.tanggal, shift: planningFilter.shift }
    });
    if (res.data?.success) {
      let data = res.data.data || [];
      
      data.sort((a: any, b: any) => {
        const aPlan0 = a.strength_status === 'KRITIS' && Number(a.pcs_kanban) === 0;
        const bPlan0 = b.strength_status === 'KRITIS' && Number(b.pcs_kanban) === 0;
        if (aPlan0 && !bPlan0) return -1;
        if (!aPlan0 && bPlan0) return 1;

        const statusOrder: Record<string, number> = { 'KRITIS': 1, 'SAFE': 2, 'OVER': 3 };
        return (statusOrder[a.strength_status] || 99) - (statusOrder[b.strength_status] || 99);
      });
      planningList.value = data;
    } else {
      planningList.value = [];
    }
  } catch (error) {
    console.error('Error fetching planning:', error);
    await showAlert('error', 'Gagal', 'Gagal memuat data Planning.');
  } finally {
    isPlanningLoading.value = false;
  }
}

const planKeys = ['matnr', 'job_number', 'zrouting', 'labst', 'pcs_kanban', 'zstrength', 'strength_status', 'lotsize'];
type PlanColKey = 'matnr' | 'job_number' | 'zrouting' | 'labst' | 'pcs_kanban' | 'zstrength' | 'strength_status' | 'lotsize';
const planFilter = createExcelFilter<PlanColKey>(planKeys as PlanColKey[], () => planningList.value);
const planFilteredList = computed(() => planFilter.applyFilters(planningList.value));

</script>
<style scoped>
/* ===== DIALOG ===== */
.dialog-overlay { position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(2px); }
.dialog-box { background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.18),0 4px 16px rgba(0,0,0,.08);width:92%;max-width:440px;overflow:hidden; }
.dialog-box-wide { max-width:820px; }
.dialog-header { display:flex;align-items:flex-start;gap:14px;padding:20px 20px 0; }
.dialog-icon { width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
.dialog-icon-success{background:#dcfce7;color:#16a34a}.dialog-icon-error{background:#fee2e2;color:#dc2626}
.dialog-icon-warning{background:#fef3c7;color:#d97706}.dialog-icon-info{background:#dbeafe;color:#2563eb}
.dialog-icon-confirm{background:#ede9fe;color:#7c3aed}
.dialog-title { font-size:14px;font-weight:600;color:#0f172a;line-height:1.4;padding-top:8px; }
.dialog-body { padding:10px 20px 16px 74px;font-size:13px;color:#475569;line-height:1.65; }
.dialog-footer { display:flex;gap:8px;justify-content:flex-end;padding:14px 20px;border-top:1px solid #f1f5f9;background:#f8fafc; }
.dialog-btn { display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;padding:7px 18px;border-radius:8px;border:none;cursor:pointer;transition:all .15s;line-height:1; }
.dialog-btn-primary{background:#2563eb;color:#fff}.dialog-btn-primary:hover{background:#1d4ed8}
.dialog-btn-success{background:#16a34a;color:#fff}.dialog-btn-success:hover{background:#15803d}
.dialog-btn-danger{background:#dc2626;color:#fff}.dialog-btn-danger:hover{background:#b91c1c}
.dialog-btn-ghost{background:#fff;color:#64748b;border:1px solid #e2e8f0}.dialog-btn-ghost:hover{background:#f1f5f9}
.dialog-fade-enter-active,.dialog-fade-leave-active{transition:opacity .18s ease}
.dialog-fade-enter-active .dialog-box,.dialog-fade-leave-active .dialog-box{transition:opacity .18s ease,transform .2s ease}
.dialog-fade-enter-from,.dialog-fade-leave-to{opacity:0}
.dialog-fade-enter-from .dialog-box{opacity:0;transform:translateY(12px) scale(.97)}
.dialog-fade-leave-to .dialog-box{opacity:0;transform:translateY(8px) scale(.98)}

/* Preview table */
.preview-table-wrap{max-height:300px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;background:#fff}
.preview-table{width:100%;border-collapse:collapse;font-size:11px;white-space:nowrap}
.preview-table thead th{position:sticky;top:0;background:#f8fafc;padding:7px 10px;text-align:left;font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
.preview-table tbody td{padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#334155}
.preview-table tbody tr:hover td{background:#f8fafc}
.preview-table tfoot td{padding:8px 10px;background:#f1f5f9;border-top:2px solid #e2e8f0;font-size:11px}

/* ===== SHARED EXCEL FILTER ===== */
.excel-filter-btn { display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;font-size:9px;border-radius:3px;border:1px solid #e2e8f0;background:#fff;color:#94a3b8;cursor:pointer;flex-shrink:0;transition:all .12s;line-height:1;padding:0; }
.excel-filter-btn:hover{background:#f1f5f9;color:#475569;border-color:#cbd5e1}
.excel-filter-btn-active{background:#eff6ff;color:#2563eb;border-color:#bfdbfe}
.excel-dropdown { position:absolute;top:calc(100% + 4px);left:0;min-width:200px;max-width:280px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12),0 2px 6px rgba(0,0,0,.06);z-index:200;overflow:hidden; }
.excel-dropdown-right{left:auto;right:0}
.excel-dropdown-search{padding:8px 10px 6px;border-bottom:1px solid #f1f5f9}
.excel-search-input{width:100%;padding:4px 8px;font-size:11px;border:1px solid #e2e8f0;border-radius:6px;outline:none;color:#334155}
.excel-search-input:focus{border-color:#93c5fd;box-shadow:0 0 0 2px rgba(59,130,246,.15)}
.excel-check-all{display:flex;align-items:center;gap:7px;padding:6px 10px;font-size:11px;font-weight:600;color:#475569;cursor:pointer;border-bottom:1px solid #f1f5f9;background:#f8fafc}
.excel-check-all:hover{background:#f1f5f9}
.excel-check-all input[type="checkbox"],.excel-option input[type="checkbox"]{width:13px;height:13px;accent-color:#2563eb;flex-shrink:0;cursor:pointer}
.excel-options-list{max-height:200px;overflow-y:auto;padding:4px 0}
.excel-option{display:flex;align-items:center;gap:7px;padding:5px 10px;font-size:11px;color:#334155;cursor:pointer;transition:background .1s;font-family:ui-monospace,monospace}
.excel-option:hover{background:#f8fafc}
.excel-options-list::-webkit-scrollbar{width:4px}
.excel-options-list::-webkit-scrollbar-track{background:transparent}
.excel-options-list::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}

/* ===== DATE RANGE DROPDOWN ===== */
.date-range-dropdown { position:absolute;top:calc(100% + 4px);left:0;width:280px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.13),0 2px 8px rgba(0,0,0,.07);z-index:200;overflow:hidden; }
.date-range-header { display:flex;align-items:center;gap:6px;padding:10px 12px;background:linear-gradient(135deg,#eef2ff,#f0f9ff);border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:700;color:#4338ca; }
.date-range-body { padding:12px; }
.date-range-row { display:flex;align-items:center;gap:8px;margin-bottom:8px; }
.date-range-label { font-size:10px;font-weight:600;color:#64748b;width:46px;flex-shrink:0; }
.date-range-input { flex:1;padding:5px 8px;font-size:11px;border:1px solid #e2e8f0;border-radius:6px;outline:none;color:#334155;font-family:ui-monospace,monospace; }
.date-range-input:focus { border-color:#818cf8;box-shadow:0 0 0 2px rgba(99,102,241,.15); }
.date-quick-picks { display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;padding-top:4px;border-top:1px solid #f1f5f9; padding-top:8px; }
.date-quick-btn { padding:3px 8px;font-size:10px;font-weight:600;border:1px solid #e2e8f0;border-radius:5px;background:#f8fafc;color:#475569;cursor:pointer;transition:all .12s; }
.date-quick-btn:hover { background:#eff6ff;border-color:#bfdbfe;color:#2563eb; }
.date-quick-clear { color:#ef4444;border-color:#fecaca; }
.date-quick-clear:hover { background:#fef2f2;border-color:#fca5a5;color:#dc2626; }
.date-unique-list { max-height:140px;overflow-y:auto;border:1px solid #f1f5f9;border-radius:6px;padding:4px 0; }
.date-unique-option { display:flex;align-items:center;gap:6px;padding:4px 8px;font-size:11px;color:#334155;cursor:pointer;transition:background .1s; }
.date-unique-option:hover { background:#f8fafc; }
.date-unique-selected { background:#eef2ff; }
.date-unique-list::-webkit-scrollbar{width:3px}
.date-unique-list::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}

/* ===== SORT BUTTONS ===== */
.sort-btn { display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:3px;border:none;background:transparent;color:#cbd5e1;cursor:pointer;padding:0;flex-shrink:0;transition:all .12s; }
.sort-btn:hover { color:#64748b;background:#f1f5f9; }
.sort-btn-asc { color:#2563eb !important; }
.sort-btn-desc { color:#7c3aed !important; }
</style>

<style scoped>
table { border-spacing: 0; }
.table-excel { border-collapse: collapse; }
.table-excel th { position: sticky; top: 0; z-index: 10; background: #f8fafc; font-weight: 600; border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; }
.table-excel td { border: 1px solid #e2e8f0; padding: 0.375rem 0.75rem; vertical-align: middle; }

input, select, button { transition: all .2s ease; }
input:focus, select:focus, button:focus { outline: none; }
tbody tr { transition: background .15s ease; }
tbody tr:hover { background: #f1f5f9 !important; }

.card { background:#fff; border:1px solid #e5e7eb; border-radius:18px; box-shadow: 0 1px 2px rgba(0,0,0,.03), 0 8px 24px rgba(15,23,42,.04); overflow:hidden; }
.stat-card { background:linear-gradient(to bottom,#fff,#fafafa); border:1px solid #ececec; border-radius:18px; padding:14px; box-shadow: 0 1px 2px rgba(0,0,0,.03), 0 6px 18px rgba(0,0,0,.04); }
.stat-label { font-size:.72rem; font-weight:600; text-transform:uppercase; color:#94a3b8; letter-spacing:.05em; }
.stat-value { margin-top:6px; font-size:1.7rem; font-weight:700; }

.btn { 
  display:inline-flex; 
  align-items:center; 
  /* ... */
  color:#475569; /* <--- Ini bisa memaksa warna teks menjadi abu-abu gelap */
  border: 1px solid transparent; 
}
.btn:hover { transform:translateY(-1px); }
.btn-blue { background:#2563eb; color:white; }
.btn-green { background:#16a34a; color:white; }
.btn-amber { background:#f59e0b; color:white; }
.btn-purple { background:#8b5cf6; color:white; }
.btn-purple-active { background:#6d28d9; color:white; }
.btn-teal { background:#0d9488; color:white; }
.btn-teal:hover { background:#0f766e; }
.btn-ghost { background:white; color:#475569; border:1px solid #e2e8f0; }

.edit-input { border:1px solid #fde68a; background:#fffbea; border-radius:10px; padding:.35rem .5rem; font-size:.75rem; }

.status-chip { display:inline-flex; align-items:center; justify-content:center; min-width:75px; padding:.25rem .5rem; border-radius:999px; font-size:.68rem; font-weight:700; }
.status-safe { background:#dcfce7; color:#166534; }
.status-kritis { background:#fee2e2; color:#b91c1c; animation: pulse 2s infinite; }
.status-over { background:#fef3c7; color:#92400e; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal-container { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
.animate-fade-in { animation: fadeIn 0.25s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.98) translateY(5px); } to { opacity: 1; transform: scale(1) translateY(0); } }
.toggle-switch { width:34px; height:18px; border-radius:999px; background:rgba(255,255,255,.3); position:relative; }
.toggle-switch::after { content:''; position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:white; transition:.2s; }
.toggle-switch.on::after { transform:translateX(16px); }

::-webkit-scrollbar { height:10px; width:10px; }
::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:999px; }
</style>

<style scoped>
:root {
  --primary: #2563eb; --primary-dark: #1d4ed8; --success: #16a34a; --danger: #dc2626; --warning: #d97706; --purple: #7c3aed; --bg-soft: #f8fafc;
}

table { border-spacing: 0; }
.table-excel { border-collapse: collapse; }
.table-excel th { position: sticky; top: 0; z-index: 10; background: #f8fafc; font-weight: 600; border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; }
.table-excel td { border: 1px solid #e2e8f0; padding: 0.375rem 0.75rem; vertical-align: middle; }

input, select, button { 
  transition: all .2s ease; 
}
input:focus, select:focus, button:focus { 
  outline: none; 
}

tbody tr { transition: background .15s ease; }
tbody tr:hover { background: #f1f5f9 !important; }

.card { background:#fff; border:1px solid #e5e7eb; border-radius:18px; box-shadow: 0 1px 2px rgba(0,0,0,.03), 0 8px 24px rgba(15,23,42,.04); overflow:hidden; }
.stat-card { background:linear-gradient(to bottom,#fff,#fafafa); border:1px solid #ececec; border-radius:18px; padding:14px; box-shadow: 0 1px 2px rgba(0,0,0,.03), 0 6px 18px rgba(0,0,0,.04); }
.stat-label { font-size:.72rem; font-weight:600; text-transform:uppercase; color:#94a3b8; letter-spacing:.05em; }
.stat-value { margin-top:6px; font-size:1.7rem; font-weight:700; }

.btn { display:inline-flex; align-items:center; justify-content:center; gap:.45rem; border-radius:12px; padding:.5rem .9rem; font-size:.76rem; font-weight:600; cursor:pointer; white-space:nowrap; border: 1px solid transparent; }
.btn:hover { transform:translateY(-1px); }
.btn-blue { background:var(--primary) !important; color:white !important; }
.btn-blue:hover { background:var(--primary-dark) !important; }
.btn-green { background:var(--success) !important; color:white !important; }
.btn-green:hover { background:#15803d !important; }
.btn-amber { background:#f59e0b !important; color:white !important; }
.btn-purple { background:#8b5cf6 !important; color:white !important; }
.btn-purple-active { background:#6d28d9 !important; color:white !important; }
.btn-teal { background:#0d9488 !important; color:white !important; }
.btn-teal:hover { background:#0f766e !important; }
.btn-ghost { background:white; color:#475569; border:1px solid #e2e8f0; }

.edit-input { border:1px solid #fde68a; background:#fffbea; border-radius:10px; padding:.35rem .5rem; font-size:.75rem; }
.edit-input-amber { background:#fef3c7; }

.status-chip { display:inline-flex; align-items:center; justify-content:center; min-width:75px; padding:.25rem .5rem; border-radius:999px; font-size:.68rem; font-weight:700; }
.status-safe { background:#dcfce7; color:#166534; }
.status-kritis { background:#fee2e2; color:#b91c1c; animation: pulse 2s infinite; }
.status-over { background:#fef3c7; color:#92400e; }

/* OVERLAY MODAL FIX */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem;
}
.modal-container {
  background: white; border-radius: 20px; overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
}

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
.animate-fade-in { animation: fadeIn 0.25s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.98) translateY(5px); } to { opacity: 1; transform: scale(1) translateY(0); } }
.toggle-switch { width:34px; height:18px; border-radius:999px; background:rgba(255,255,255,.3); position:relative; }
.toggle-switch::after { content:''; position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:white; transition:.2s; }
.toggle-switch.on::after { transform:translateX(16px); }

::-webkit-scrollbar { height:10px; width:10px; }
::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:999px; }

/* Sort options inside dropdown */
.excel-dropdown-sort-section {
  padding: 4px 0;
  display: flex;
  flex-direction: column;
}
.excel-dropdown-sort-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 12px;
  font-size: 11px;
  color: #475569;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.1s ease;
}
.excel-dropdown-sort-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.excel-selection-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
}

/* Sticky (frozen) columns */
.sticky-col-0 {
  position: sticky !important;
  left: 0px !important;
  z-index: 10 !important;
  background-color: #f8fafc;
  min-width: 44px !important;
  max-width: 44px !important;
  width: 44px !important;
  border-right: 1px solid #e2e8f0 !important;
  border-bottom: 1px solid #e2e8f0 !important;
  box-shadow: inset -1px 0 0 #e2e8f0, inset 0 -1px 0 #e2e8f0 !important;
}
.sticky-col-1 {
  position: sticky !important;
  left: 44px !important;
  z-index: 10 !important;
  background-color: #ffffff;
  min-width: 220px !important;
  max-width: 220px !important;
  width: 220px !important;
  border-right: 1px solid #e2e8f0 !important;
  border-bottom: 1px solid #e2e8f0 !important;
  box-shadow: inset -1px 0 0 #e2e8f0, inset 0 -1px 0 #e2e8f0 !important;
}
.sticky-col-2 {
  position: sticky !important;
  left: 264px !important;
  z-index: 10 !important;
  background-color: #ffffff;
  min-width: 120px !important;
  max-width: 120px !important;
  width: 120px !important;
  border-right: 1px solid #e2e8f0 !important;
  border-bottom: 1px solid #e2e8f0 !important;
  box-shadow: inset -1px 0 0 #e2e8f0, inset 0 -1px 0 #e2e8f0 !important;
}
.sticky-col-3 {
  position: sticky !important;
  left: 384px !important;
  z-index: 10 !important;
  background-color: #ffffff;
  min-width: 120px !important;
  max-width: 120px !important;
  width: 120px !important;
  border-right: 2px solid #cbd5e1 !important;
  border-bottom: 1px solid #e2e8f0 !important;
  box-shadow: inset -2px 0 0 #cbd5e1, inset 0 -1px 0 #e2e8f0 !important;
}
.sticky-col-4 {
  position: sticky !important;
  left: 504px !important;
  z-index: 10 !important;
  background-color: #ffffff;
  min-width: 120px !important;
  max-width: 120px !important;
  width: 120px !important;
  border-right: 1px solid #e2e8f0 !important;
  border-bottom: 1px solid #e2e8f0 !important;
  box-shadow: inset -1px 0 0 #e2e8f0, inset 0 -1px 0 #e2e8f0 !important;
}

.table-excel th.sticky-col-0 {
  z-index: 32 !important;
  background-color: #f8fafc !important;
  border-right: 1px solid #e2e8f0 !important;
  border-bottom: 2px solid #cbd5e1 !important;
  box-shadow: inset -1px 0 0 #e2e8f0, inset 0 -2px 0 #cbd5e1 !important;
}
.table-excel th.sticky-col-1,
.table-excel th.sticky-col-2 {
  z-index: 31 !important;
  background-color: #f8fafc !important;
  border-right: 1px solid #e2e8f0 !important;
  border-bottom: 2px solid #cbd5e1 !important;
  box-shadow: inset -1px 0 0 #e2e8f0, inset 0 -2px 0 #cbd5e1 !important;
}
.table-excel th.sticky-col-3 {
  z-index: 31 !important;
  background-color: #f8fafc !important;
  border-right: 2px solid #cbd5e1 !important;
  border-bottom: 2px solid #cbd5e1 !important;
  box-shadow: inset -2px 0 0 #cbd5e1, inset 0 -2px 0 #cbd5e1 !important;
}
.table-excel th.sticky-col-4 {
  z-index: 31 !important;
  background-color: #f8fafc !important;
  border-right: 1px solid #e2e8f0 !important;
  border-bottom: 2px solid #cbd5e1 !important;
  box-shadow: inset -1px 0 0 #e2e8f0, inset 0 -2px 0 #cbd5e1 !important;
}

.table-excel tbody tr:hover .sticky-col-0 {
  background-color: #e2e8f0;
}
.table-excel tbody tr:hover .sticky-col-1,
.table-excel tbody tr:hover .sticky-col-2,
.table-excel tbody tr:hover .sticky-col-3,
.table-excel tbody tr:hover .sticky-col-4 {
  background-color: #f1f5f9;
}
</style>