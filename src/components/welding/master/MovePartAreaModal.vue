<!-- components/welding/master/MovePartAreaModal.vue
     Aksi ringkas "Pindah Area" — pindahkan 1 part welding FP ke area lain
     tanpa buka form Edit Part yang besar (30+ field). Submit ke endpoint
     update yang SAMA (PUT /welding_master/update) — server yang mendeteksi
     perubahan area & mengembalikan `area_changed`, dipakai parent untuk
     trigger refresh planning (mutasi_weld) area lama & baru (lihat event
     'moved', ditangani master-data.vue::refreshAreasInBackground). Lihat
     Aturan #12 (M_formula_engine.php) untuk alasan kenapa refresh setelah
     pindah area ini penting (bug lama: achievement historis area lama bisa
     menghidupkan kembali baris planning yang seharusnya sudah pindah). -->
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" v-modal-stack="onCancel" class="modal-overlay" @click.self.prevent>
        <div class="modal-box" style="max-width:420px">
          <div class="modal-header">
            <div class="modal-header-icon"><i class="mdi mdi-map-marker-path"></i></div>
            <div style="flex:1;min-width:0">
              <p class="modal-title">Pindah Area</p>
              <p class="modal-subtitle font-mono">{{ part?.part_number }}</p>
            </div>
            <button class="modal-close" :disabled="saving" @click="onCancel"><i class="mdi mdi-close"></i></button>
          </div>

          <div class="modal-body" style="padding:16px;display:flex;flex-direction:column;gap:14px">
            <p v-if="part?.part_name" style="font-size:12.5px;color:var(--text-secondary,#64748b);margin:0">
              {{ part.part_name }}
            </p>

            <div class="mpa-transition">
              <div class="mpa-area-badge mpa-area-from">{{ part?.area || '—' }}</div>
              <i class="mdi mdi-arrow-right mpa-arrow"></i>
              <select v-model="destArea" class="mpa-select" :disabled="saving">
                <option value="" disabled>Pilih area tujuan…</option>
                <option v-for="a in areaOptions.filter(x => x !== part?.area)" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>

            <div v-if="destArea" class="mpa-note">
              <i class="mdi mdi-information-outline"></i>
              Part akan dipindah dari <strong>{{ part?.area }}</strong> ke <strong>{{ destArea }}</strong>.
              Refresh planning kedua area dijadwalkan otomatis di server (≤1 menit).
            </div>

            <!-- Pratinjau data mutasi BERJALAN di area lama: ikut dipindah, bukan
                 dihapus engine (step 1c). Diambil tiap kali area tujuan berubah. -->
            <div v-if="destArea && previewLoading" class="mpa-note"><i class="mdi mdi-loading mdi-spin"></i> Memeriksa data mutasi berjalan…</div>
            <div v-else-if="destArea && preview" class="mpa-preview" :class="preview.has_running ? 'mpa-preview--warn' : 'mpa-preview--ok'">
              <template v-if="!preview.periods.length">
                <i class="mdi mdi-check-circle-outline"></i>
                Tidak ada baris mutasi bulan ini di <strong>{{ preview.from }}</strong> — area baru akan disemai dari nol saat refresh.
              </template>
              <template v-else>
                <p class="mpa-preview-title">
                  <i class="mdi" :class="preview.has_running ? 'mdi-database-arrow-right-outline' : 'mdi-check-circle-outline'"></i>
                  {{ preview.has_running ? 'Ada data berjalan di area lama — akan IKUT dipindah:' : 'Baris mutasi ada tapi masih kosong — ikut dipindah:' }}
                </p>
                <ul class="mpa-preview-list">
                  <li v-for="p in preview.periods" :key="p.period_year + '-' + p.period_month">
                    <strong>{{ monthLabel(p.period_year, p.period_month) }}</strong> · {{ p.rows_total }} hari
                    <span v-if="p.days_actual"> · actual <strong>{{ fmt(p.actual_total) }}</strong> pcs ({{ p.days_actual }} hari)</span>
                    <span v-if="p.lock_initial_stock"> · initial stock terkunci <strong>{{ fmt(p.initial_stock ?? 0) }}</strong></span>
                    <span v-if="p.adjust_days"> · {{ p.adjust_days }} adjust stok</span>
                    <span v-if="p.locked_plan_days"> · {{ p.locked_plan_days }} plan terkunci</span>
                    <span v-if="p.conflict_days" class="mpa-conflict"> · <i class="mdi mdi-alert-outline"></i> {{ p.conflict_days }} hari sudah ada di {{ preview.to }} (dibiarkan, tidak ditimpa)</span>
                  </li>
                </ul>
              </template>
            </div>
            <p v-if="errorMsg" class="mpa-error">{{ errorMsg }}</p>
          </div>

          <div class="modal-footer">
            <button class="md-btn md-btn-ghost" :disabled="saving" @click="onCancel">Batal</button>
            <button class="md-btn md-btn-primary" :disabled="saving || !destArea" @click="onConfirm">
              <i class="mdi" :class="saving ? 'mdi-loading mdi-spin' : 'mdi-map-marker-check-outline'"></i>
              {{ saving ? 'Memindahkan...' : 'Pindahkan' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import masterService from '@/services/Public/Welding/masterService';
import type { AreaMovePreview } from '@/types/Public/Welding/master';
import { vModalStack } from '@/directives/modalStack';

const props = defineProps<{
  open: boolean;
  part: { id: number; part_number: string; part_name?: string | null; area: string } | null;
  areaOptions: string[];
}>();

const emit = defineEmits<{
  close: [];
  moved: [{ old: string | null; new: string; mutasi_moved?: number; mutasi_conflict?: number }];
}>();

const destArea = ref('');
const saving   = ref(false);
const errorMsg = ref<string | null>(null);
const preview        = ref<AreaMovePreview | null>(null);
const previewLoading = ref(false);

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
function monthLabel(y: number, m: number) { return `${MONTHS[m - 1] ?? m} ${y}`; }
function fmt(n: number) { return new Intl.NumberFormat('id-ID').format(n ?? 0); }

// Tiap ganti tujuan → tarik pratinjau. Guard token: respons lama yg datang
// belakangan tidak boleh menimpa pratinjau tujuan yg baru dipilih.
let previewSeq = 0;
watch(destArea, async (to) => {
  preview.value = null;
  if (!to || !props.part) return;
  const seq = ++previewSeq;
  previewLoading.value = true;
  try {
    const p = await masterService.areaMovePreview(props.part.id, to);
    if (seq === previewSeq) preview.value = p;
  } catch { /* pratinjau opsional — pindah tetap boleh */ }
  finally { if (seq === previewSeq) previewLoading.value = false; }
});

// Reset field tiap kali modal dibuka utk part baru (jangan bawa sisa pilihan
// sebelumnya kalau user buka utk part lain berikutnya).
watch(() => props.open, (v) => {
  if (v) { destArea.value = ''; errorMsg.value = null; preview.value = null; }
});

function onCancel() {
  if (saving.value) return;
  emit('close');
}

async function onConfirm() {
  if (!props.part || !destArea.value || saving.value) return;
  saving.value = true;
  errorMsg.value = null;
  try {
    const res = await masterService.update(props.part.id, { area: destArea.value });
    if (!res.success) {
      errorMsg.value = res.message || 'Gagal memindahkan area.';
      return;
    }
    if (res.area_changed) emit('moved', res.area_changed);
    emit('close');
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message ?? 'Terjadi kesalahan.';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
/* Modal generik (overlay/box/header/footer) — SENGAJA disalin dari master-data.vue,
   BUKAN diwarisi otomatis: <style scoped> Vue tidak menular antar komponen terpisah
   (data-v-xxx hanya menempel ke elemen milik komponen itu sendiri). Bug nyata yang
   ditemukan 2026-07-31: tanpa blok ini, .modal-overlay tak bergaya sama sekali
   (position:static, z-index:auto) → render off-screen tepat di y=viewport-height,
   terlihat "tidak bereaksi apa pun" saat diklik walau state Vue-nya sudah open=true. */
.mpa-preview {
  font-size: 12px; line-height: 1.5; border-radius: 8px; padding: 10px 12px;
  border: 1px solid var(--dm-border, #e3e8f2); background: var(--dm-surface2, #f8fafc); color: var(--dm-cell, #334155);
}
.mpa-preview--warn { border-color: var(--dm-bd-amber, #f0d9a8); background: var(--dm-tint-amber, #fdf7ea); }
.mpa-preview--ok   { border-color: var(--dm-bd-green, #bbf7d0); background: var(--dm-tint-green, #f0fdf4); }
.mpa-preview-title { margin: 0 0 6px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.mpa-preview-list { margin: 0; padding-left: 18px; }
.mpa-preview-list li { margin: 2px 0; }
.mpa-conflict { color: var(--dm-on-amber, #b45309); }
.modal-overlay {
  position: fixed; inset: 0; z-index: 99990;
  background: rgba(15, 23, 42, 0.55);
  display: flex; align-items: center; justify-content: center;
  padding: 16px; backdrop-filter: blur(2px);
}
.modal-box {
  background: var(--dm-surface, white); border-radius: 10px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  display: flex; flex-direction: column; max-height: 90vh; overflow: hidden;
}
.modal-header {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  background: linear-gradient(135deg, #2e5396, #4472c4); color: white; flex-shrink: 0;
}
.modal-header-icon {
  width: 34px; height: 34px; border-radius: 8px; background: rgba(255, 255, 255, 0.15);
  display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;
}
.modal-title { font-size: 13px; font-weight: 700; margin: 0; }
.modal-subtitle { font-size: 11px; opacity: 0.85; margin: 0; }
.modal-close {
  margin-left: auto; width: 28px; height: 28px; border-radius: 6px;
  background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.8);
  display: flex; align-items: center; justify-content: center; font-size: 14px;
  cursor: pointer; border: none; flex-shrink: 0; transition: background 0.15s;
}
.modal-close:hover:not(:disabled) { background: rgba(255, 255, 255, 0.25); }
.modal-close:disabled { opacity: 0.4; cursor: not-allowed; }
.modal-body { padding: 16px; overflow-y: auto; flex: 1; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px;
  background: var(--dm-surface2, #f8fafc); border-top: 1px solid var(--dm-border, #e5e9f0); flex-shrink: 0;
}
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.18s; }
.modal-fade-enter-active .modal-box, .modal-fade-leave-active .modal-box { transition: transform 0.18s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal-box, .modal-fade-leave-to .modal-box { transform: scale(0.96) translateY(-8px); }

.md-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px;
  font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; border: none;
  white-space: nowrap; text-decoration: none;
}
.md-btn-primary { background: #2e5396; color: white; }
.md-btn-primary:hover { background: #4472c4; }
.md-btn-ghost { background: transparent; color: var(--dm-muted, #6b7280); border: 1.5px solid var(--dm-border, #e5e7eb); }
.md-btn-ghost:hover { background: var(--dm-bg, #f3f4f6); }
.md-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.mpa-transition { display: flex; align-items: center; gap: 10px; }
.mpa-area-badge {
  font-size: 11.5px; font-weight: 700; padding: 5px 10px; border-radius: 6px;
  white-space: nowrap; background: var(--bg-secondary, var(--dm-bg, #f1f5f9)); color: var(--text-secondary, var(--dm-text-2, #475569));
}
.mpa-arrow { color: var(--text-secondary, var(--dm-faint, #94a3b8)); font-size: 16px; flex-shrink: 0; }
.mpa-select {
  flex: 1; min-width: 0; padding: 7px 9px; border: 1px solid var(--border, var(--dm-border-strong, #cbd5e1));
  border-radius: 6px; font-size: 12.5px; background: var(--bg-primary, var(--dm-surface, #fff)); color: var(--text-primary, var(--dm-text, #1e293b));
}
.mpa-note {
  display: flex; align-items: flex-start; gap: 6px; font-size: 11.5px; line-height: 1.5;
  color: var(--text-secondary, var(--dm-text-2, #475569)); background: var(--bg-secondary, var(--dm-surface2, #f8fafc));
  border: 1px solid var(--border, var(--dm-border, #e2e8f0)); border-radius: 6px; padding: 8px 10px;
}
.mpa-note .mdi { font-size: 15px; margin-top: 1px; flex-shrink: 0; color: var(--primary, #6366f1); }
.mpa-error { font-size: 12px; color: var(--dm-on-red, #dc2626); margin: 0; }
</style>
