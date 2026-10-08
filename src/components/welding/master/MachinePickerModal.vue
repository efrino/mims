<script setup lang="ts">
// MachinePickerModal — picker mesin visual (denah 2D) buat field "Mesin" di
// form Tambah/Edit Part WELDING (master-data.vue). Ganti input teks polos
// dgn visualisasi denah yg SAMA persis sumbernya (ms_line_machine_map, via
// machineMapService — API yg sama dipakai halaman Peta Mesin & UPH), biar
// gak ada sumber data mesin kedua yg bisa drift.
//
// Aturan pemilihan (sesuai area — lihat isRobotSetup di useWeldingAreas):
//  - ROBOT (CO *, SA HMMI; di SA ADM hanya mesin RSW/RB): 1 part = 1 mesin +
//    1 jig (single-select + jig chip). Di SA ADM mode ikut mesin yg diklik.
//  - Selain ROBOT (WSS dkk): multi-proses — klik mesin BERURUTAN, nomor urut
//    keliatan di kotaknya, "Total Proses" = jumlah mesin yg dipilih. Hasilnya
//    digabung jadi string mesin dipisah spasi (mis. "A1 A2"), format yg SAMA
//    dgn kolom ms_welding.machine yg sudah ada (kompatibel dgn seluruh
//    fitur lain: route seeding, feeder CKD, backup, dst — lihat CLAUDE.md
//    "Aturan #8" multi-machine routing).
// CKD preview: kalau mesin yg dipilih punya CKD ter-mount (ms_machine_ckd),
// ditampilkan sbg catatan "otomatis jadi anak part ini" — surfacing behavior
// M_weld::_auto_link_machine_ckd (backend) biar user LIHAT efeknya, bukan
// cuma kejadian diam2 pas save.
import { ref, computed, watch } from 'vue'
import { vModalStack } from '@/directives/modalStack'
import machineMapService from '@/services/Public/Welding/machineMapService'
import type { MachineMapGroup, MachineFamily, MachineMapMachine, MachineCkdRow, BackupCandidate } from '@/types/Public/Welding/master'
import { ROBOT_AREAS, MIXED_ROBOT_AREAS, isRobotMachineCode } from '@/composables/useWeldingAreas'

const props = defineProps<{ modelValue: boolean; area: string | null | undefined; initialMachine?: string | null; initialJig?: string | null }>()
const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  apply: [payload: { machine: string; jig?: string | null; total_proses?: number }]
}>()

const areaUpper = computed(() => (props.area || '').trim().toUpperCase())
const isMixedArea = computed(() => MIXED_ROBOT_AREAS.includes(areaUpper.value))
// Area campuran: robot hanya bila mesin terpilih = mesin robot (RSW/RB).
const isRobot = computed(() => ROBOT_AREAS.includes(areaUpper.value)
  || (isMixedArea.value && isRobotMachineCode(selectedMachine.value)))

const loading = ref(false)
const loadError = ref<string | null>(null)
const groups = ref<MachineMapGroup[]>([])
const myGroup = computed(() => groups.value.find(g => g.category === 'WELDING' && g.area === props.area) ?? null)

function familiesFromFlat(machines: MachineMapMachine[]): MachineFamily[] {
  const byRow = new Map<number, MachineMapMachine[]>()
  for (const m of machines) {
    const r = m.row_idx ?? 0
    if (!byRow.has(r)) byRow.set(r, [])
    byRow.get(r)!.push(m)
  }
  const rows = Array.from(byRow.keys()).sort((a, b) => a - b)
  return rows.map(r => ({
    family: 'row-' + r,
    machines: byRow.get(r)!.slice().sort((a, b) => (a.col_idx ?? 0) - (b.col_idx ?? 0)),
  }))
}
const rows = computed(() => familiesFromFlat(myGroup.value?.machines ?? []))

// ── ROBOT: single machine + jig ──
const selectedMachine = ref<string | null>(null)
const selectedJig = ref<string | null>(null)
const newJigCode = ref('')

// ── Non-ROBOT: urutan multi-proses ──
const sequence = ref<string[]>([])
function seqIndexOf(m: string) { return sequence.value.indexOf(m) }
function toggleSequence(m: string) {
  const idx = seqIndexOf(m)
  if (idx === -1) sequence.value.push(m)
  else sequence.value.splice(idx, 1)
}

// ── CKD preview (lazy, per mesin) ──
const ckdCache = ref<Record<string, MachineCkdRow[] | 'loading' | 'none'>>({})
async function ensureCkdPreview(m: string) {
  if (ckdCache.value[m]) return
  ckdCache.value[m] = 'loading'
  try {
    const rowsCkd = await machineMapService.getMachineCkds(props.area || '', m)
    ckdCache.value[m] = rowsCkd.filter(r => !!r.is_active)
  } catch { ckdCache.value[m] = 'none' }
}

// ── Fallback manual (area belum ada denah) ──
const manualMode = ref(false)
const manualText = ref('')

// ── Mesin Cadangan (Backup) — pra-konfigurasi buat mesin UTAMA yg lagi
// dipilih (ROBOT: satu2nya mesin; multi-proses: mesin TERAKHIR di urutan,
// biasanya proses akhir/paling kritis). Kandidat diturunkan dari CKD yg sama
// (get_backup_candidates, sama sumbernya dgn fitur backup di Peta Mesin).
const primaryMachine = computed(() => {
  if (isRobot.value) return selectedMachine.value
  return sequence.value.length ? sequence.value[sequence.value.length - 1] : null
})
const backupCandidates = ref<BackupCandidate[]>([])
const backupLoading = ref(false)
const selectedBackupMachine = ref<string | null>(null)
const backupLocked = ref(false) // true kalau mesin utama lagi status TROUBLE (insiden aktif)
const backupSaveError = ref<string | null>(null)

async function loadBackupInfo(machine: string) {
  backupLoading.value = true
  backupLocked.value = false
  selectedBackupMachine.value = null
  backupCandidates.value = []
  try {
    const [candidates, status] = await Promise.all([
      machineMapService.getBackupCandidates(machine),
      machineMapService.getMachineStatus(machine),
    ])
    backupCandidates.value = candidates
    selectedBackupMachine.value = status?.backup_machine ?? null
    backupLocked.value = status?.status === 'TROUBLE'
  } catch {
    backupCandidates.value = []
  } finally {
    backupLoading.value = false
  }
}
watch(primaryMachine, (m) => {
  backupSaveError.value = null
  if (m) loadBackupInfo(m)
  else { backupCandidates.value = []; selectedBackupMachine.value = null; backupLocked.value = false }
})

function onPickMachine(m: string) {
  // Area campuran: klik mesin robot → mode robot (buang urutan), mesin manual → multi-proses.
  if (isMixedArea.value) {
    if (isRobotMachineCode(m)) sequence.value = []
    else if (selectedMachine.value) { selectedMachine.value = null; selectedJig.value = null }
  }
  if (ROBOT_AREAS.includes(areaUpper.value) || (isMixedArea.value && isRobotMachineCode(m))) {
    selectedMachine.value = selectedMachine.value === m ? null : m
    if (selectedMachine.value) {
      selectedJig.value = null
      ensureCkdPreview(m)
    }
  } else {
    toggleSequence(m)
    ensureCkdPreview(m)
  }
}

function jigCodesFor(m: string): string[] {
  const machine = myGroup.value?.machines?.find(x => x.machine === m)
  return machine?.jig_codes ?? []
}

async function reload() {
  loading.value = true
  loadError.value = null
  try {
    groups.value = await machineMapService.getMachineMap()
  } catch (e: any) {
    loadError.value = e?.response?.data?.message ?? 'Gagal memuat denah mesin.'
  } finally {
    loading.value = false
  }
}

watch(() => props.modelValue, (open) => {
  if (!open) return
  selectedMachine.value = null
  selectedJig.value = null
  newJigCode.value = ''
  sequence.value = props.initialMachine ? props.initialMachine.trim().split(/\s+/).filter(Boolean) : []
  if ((ROBOT_AREAS.includes(areaUpper.value) || (isMixedArea.value && isRobotMachineCode(sequence.value[0])))
      && sequence.value.length) {
    selectedMachine.value = sequence.value[0]
    sequence.value = []
  }
  selectedJig.value = props.initialJig ?? null
  ckdCache.value = {}
  manualMode.value = false
  manualText.value = props.initialMachine ?? ''
  reload()
})

const canApply = computed(() => isRobot.value ? !!selectedMachine.value : sequence.value.length > 0)
const previewText = computed(() => {
  if (isRobot.value) return selectedMachine.value ? `${selectedMachine.value}${selectedJig.value ? ' · Jig ' + selectedJig.value : ''}` : '—'
  return sequence.value.length ? `${sequence.value.join(' → ')} (Total Proses: ${sequence.value.length})` : '—'
})

const applyBusy = ref(false)

function close() { emit('update:modelValue', false) }
async function applyPick() {
  if (manualMode.value) {
    const m = manualText.value.trim()
    if (!m) return
    emit('apply', { machine: m })
    close()
    return
  }
  if (isRobot.value) {
    if (!selectedMachine.value) return
  } else {
    if (!sequence.value.length) return
  }
  // Simpan mesin cadangan dulu (kalau berubah dari yg tersimpan) — non-blocking
  // thd apply mesin utamanya sendiri, tapi tunggu biar error kelihatan kalau gagal.
  if (primaryMachine.value && !backupLocked.value) {
    applyBusy.value = true
    backupSaveError.value = null
    try {
      const res = await machineMapService.saveMachineBackup(primaryMachine.value, selectedBackupMachine.value)
      if (!res.success) { backupSaveError.value = res.message ?? 'Gagal menyimpan mesin cadangan.'; applyBusy.value = false; return }
    } catch (e: any) {
      backupSaveError.value = e?.response?.data?.message ?? 'Gagal menyimpan mesin cadangan.'
      applyBusy.value = false
      return
    }
    applyBusy.value = false
  }
  if (isRobot.value) {
    emit('apply', { machine: selectedMachine.value!, jig: selectedJig.value })
  } else {
    emit('apply', { machine: sequence.value.join(' '), total_proses: sequence.value.length })
  }
  close()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="mpm-fade">
      <div v-if="modelValue" v-modal-stack="close" class="mpm-overlay" @click.self.prevent>
        <div class="mpm-box">
          <div class="mpm-header">
            <div>
              <h2><i class="mdi mdi-factory"></i> Pilih Mesin</h2>
              <p class="mpm-sub">{{ area || '—' }} <span v-if="isRobot" class="mpm-mode-badge mpm-mode-badge--robot">1 mesin + 1 jig</span><span v-else class="mpm-mode-badge">multi-proses berurutan</span></p>
            </div>
            <button class="mpm-close" @click="close"><i class="mdi mdi-close"></i></button>
          </div>

          <div class="mpm-body">
            <div v-if="loading" class="mpm-status"><i class="mdi mdi-loading mdi-spin"></i> Memuat denah...</div>
            <div v-else-if="loadError" class="mpm-status mpm-status--error">{{ loadError }}</div>
            <div v-else-if="!myGroup || !rows.length" class="mpm-status">
              Belum ada denah untuk area "{{ area }}". <button class="mpm-link-btn" @click="manualMode = true">Isi manual</button> atau atur dulu di halaman Peta Mesin.
            </div>

            <template v-if="!manualMode && myGroup && rows.length">
              <p class="mpm-hint">
                <template v-if="isRobot">Klik 1 mesin, lalu pilih jig-nya (kalau ada).</template>
                <template v-else>Klik mesin SESUAI URUTAN proses (klik lagi buat batalkan). Nomor = urutan proses.</template>
              </p>
              <div class="mpm-grid">
                <div v-for="f in rows" :key="f.family" class="mpm-row">
                  <div v-for="m in f.machines" :key="m.machine" class="mpm-slot-wrap">
                    <button
                      type="button" class="mpm-slot"
                      :class="{
                        'mpm-slot--active': isRobot ? selectedMachine === m.machine : seqIndexOf(m.machine) !== -1,
                        'mpm-slot--trouble': m.status === 'TROUBLE',
                      }"
                      :title="`${m.machine} — ${m.part_count} part`"
                      @click="onPickMachine(m.machine)"
                    >
                      {{ m.machine }}
                      <span v-if="!isRobot && seqIndexOf(m.machine) !== -1" class="mpm-seq-badge">{{ seqIndexOf(m.machine) + 1 }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- ROBOT: jig chips -->
              <div v-if="isRobot && selectedMachine" class="mpm-jig-panel">
                <p class="mpm-panel-label">Jig di {{ selectedMachine }}:</p>
                <div class="mpm-jig-chips">
                  <button
                    v-for="code in jigCodesFor(selectedMachine)" :key="code" type="button"
                    class="mpm-chip" :class="{ 'mpm-chip--active': selectedJig === code }"
                    @click="selectedJig = selectedJig === code ? null : code"
                  >Jig {{ code }}</button>
                  <span v-if="!jigCodesFor(selectedMachine).length" class="mpm-empty-note">Belum ada jig terdaftar di mesin ini.</span>
                </div>
                <div class="mpm-jig-add">
                  <input v-model="newJigCode" type="text" placeholder="Kode jig baru..." @keydown.enter="selectedJig = newJigCode.trim() || selectedJig" />
                  <button type="button" @click="selectedJig = newJigCode.trim() || selectedJig">Pakai</button>
                </div>
              </div>

              <!-- CKD preview per mesin terpilih -->
              <div v-if="isRobot ? !!selectedMachine : sequence.length" class="mpm-ckd-preview">
                <template v-for="m in (isRobot ? (selectedMachine ? [selectedMachine] : []) : sequence)" :key="'ckdp-' + m">
                  <div v-if="ckdCache[m] === 'loading'" class="mpm-ckd-line"><i class="mdi mdi-loading mdi-spin"></i> Cek CKD {{ m }}...</div>
                  <div v-else-if="Array.isArray(ckdCache[m]) && (ckdCache[m] as MachineCkdRow[]).length" class="mpm-ckd-line mpm-ckd-line--info">
                    <i class="mdi mdi-source-branch"></i> {{ m }}: CKD {{ (ckdCache[m] as MachineCkdRow[]).map(c => c.part_number).join(', ') }}
                    <span v-if="(ckdCache[m] as MachineCkdRow[]).length === 1">— otomatis jadi anak part ini saat disimpan.</span>
                    <span v-else>— &gt;1 CKD terpasang, pilih manual lewat relasi BOM kalau perlu.</span>
                  </div>
                </template>
              </div>

              <!-- Mesin Cadangan (Backup) — pra-konfigurasi utk mesin UTAMA yg lagi
                   dipilih (ROBOT: satu2nya; multi-proses: mesin terakhir di urutan). -->
              <div v-if="primaryMachine" class="mpm-backup-panel">
                <p class="mpm-panel-label">
                  Mesin Cadangan (Backup) <span class="mpm-backup-sub">untuk {{ primaryMachine }}</span>
                </p>
                <p v-if="backupSaveError" class="mpm-backup-error"><i class="mdi mdi-alert-circle"></i> {{ backupSaveError }}</p>
                <div v-if="backupLocked" class="mpm-backup-locked">
                  <i class="mdi mdi-alert"></i> {{ primaryMachine }} sedang TROUBLE (insiden aktif) — atur cadangan lewat Peta Mesin/Utilisasi Mesin.
                </div>
                <template v-else>
                  <div v-if="backupLoading" class="mpm-status" style="padding:8px"><i class="mdi mdi-loading mdi-spin"></i> Memuat kandidat...</div>
                  <div v-else class="mpm-jig-chips">
                    <button
                      type="button" class="mpm-chip" :class="{ 'mpm-chip--active': selectedBackupMachine === null }"
                      @click="selectedBackupMachine = null"
                    >Tanpa cadangan</button>
                    <button
                      v-for="c in backupCandidates" :key="c.machine" type="button"
                      class="mpm-chip" :class="{ 'mpm-chip--active': selectedBackupMachine === c.machine }"
                      :title="`${c.area} · ${c.shared_ckd} CKD sama · ${c.part_count} part`"
                      @click="selectedBackupMachine = c.machine"
                    >{{ c.machine }}</button>
                    <span v-if="!backupCandidates.length" class="mpm-empty-note">Gak ada mesin lain yg berbagi CKD — set manual gak tersedia.</span>
                  </div>
                </template>
              </div>

              <button class="mpm-manual-toggle" @click="manualMode = true"><i class="mdi mdi-pencil-outline"></i> Isi manual (mesin belum ada di denah)</button>
            </template>

            <template v-else-if="manualMode">
              <p class="mpm-hint">Isi nama mesin manual (dipisah spasi kalau multi-proses, mis. "A1 A2").</p>
              <input v-model="manualText" type="text" class="mpm-manual-input" placeholder="A1 A2" />
              <button v-if="myGroup && rows.length" class="mpm-manual-toggle" @click="manualMode = false"><i class="mdi mdi-map-outline"></i> Kembali ke denah</button>
            </template>
          </div>

          <div class="mpm-footer">
            <p class="mpm-preview"><b>Hasil:</b> {{ manualMode ? (manualText || '—') : previewText }}</p>
            <div class="mpm-footer-actions">
              <button class="mpm-btn mpm-btn--ghost" @click="close">Batal</button>
              <button class="mpm-btn mpm-btn--primary" :disabled="applyBusy || (manualMode ? !manualText.trim() : !canApply)" @click="applyPick">
                <i v-if="applyBusy" class="mdi mdi-loading mdi-spin"></i> Terapkan
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mpm-overlay {
  /* master-data.vue's Tambah/Edit Part modal (.modal-overlay) pakai
     z-index: 99990, & modal2 nested lain di situ naik bertahap sampai 99996
     (lihat komentar di master-data.vue soal Teleport + urutan template) —
     picker ini dibuka DARI DALAM modal itu, jadi harus lebih tinggi lagi. */
  position: fixed; inset: 0; z-index: 99997; background: rgba(15,23,42,0.55);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.mpm-box {
  width: min(720px, 100%); max-height: 88vh; background: var(--dm-surface, white); border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3); display: flex; flex-direction: column; overflow: hidden;
}
.mpm-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 16px 18px; border-bottom: 1px solid var(--dm-border, #e2e8f0);
}
.mpm-header h2 { margin: 0; font-size: 16px; color: var(--dm-text, #1e293b); display: flex; align-items: center; gap: 6px; }
.mpm-sub { margin: 3px 0 0; font-size: 12px; color: var(--dm-muted, #64748b); display: flex; align-items: center; gap: 8px; }
.mpm-mode-badge {
  font-size: 10px; font-weight: 800; color: #7c3aed; background: var(--dm-tint-violet, #f5f3ff); border: 1px solid var(--dm-bd-blue, #ddd6fe);
  border-radius: 999px; padding: 2px 8px;
}
.mpm-mode-badge--robot { color: var(--dm-accent, #2563eb); background: var(--dm-tint-blue, #eff6ff); border-color: var(--dm-bd-blue, #bfdbfe); }
.mpm-close { border: none; background: var(--dm-bg, #f1f5f9); color: var(--dm-muted, #64748b); width: 30px; height: 30px; border-radius: 8px; cursor: pointer; }
.mpm-close:hover { background: var(--dm-bg, #e2e8f0); }

.mpm-body { padding: 16px 18px; overflow-y: auto; flex: 1; }
.mpm-status { padding: 24px; text-align: center; color: var(--dm-muted, #64748b); font-size: 13px; }
.mpm-status--error { color: var(--dm-on-red, #dc2626); }
.mpm-link-btn { border: none; background: none; color: var(--dm-accent, #2563eb); text-decoration: underline; cursor: pointer; font-size: inherit; padding: 0; }
.mpm-hint { font-size: 12px; color: var(--dm-text-2, #475569); margin: 0 0 10px; }

.mpm-grid { display: flex; flex-direction: column; gap: 8px; }
.mpm-row { display: flex; gap: 6px; flex-wrap: wrap; }
.mpm-slot-wrap { position: relative; }
.mpm-slot {
  position: relative; width: 46px; height: 46px; border: 1.5px solid var(--dm-border-strong, #cbd5e1); border-radius: 6px;
  background: var(--dm-surface, white); color: var(--dm-text, #1e293b); font-size: 10.5px; font-weight: 700; cursor: pointer;
  font-family: inherit; transition: all 0.12s;
}
.mpm-slot:hover { border-color: #94a3b8; background: var(--dm-surface2, #f8fafc); }
.mpm-slot--active { border-color: #2e5396; background: var(--dm-tint-blue, #dbeafe); box-shadow: 0 0 0 2px rgba(46,83,150,0.25); }
.mpm-slot--trouble { border-color: #dc2626; }
.mpm-seq-badge {
  position: absolute; top: -7px; right: -7px; width: 18px; height: 18px; border-radius: 50%;
  background: #2e5396; color: white; font-size: 10px; font-weight: 800; display: flex;
  align-items: center; justify-content: center; box-shadow: 0 0 0 1.5px white;
}

.mpm-jig-panel { margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--dm-border, #e2e8f0); }
.mpm-panel-label { font-size: 12px; font-weight: 700; color: var(--dm-text-2, #475569); margin: 0 0 6px; }
.mpm-jig-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.mpm-chip {
  padding: 5px 11px; border-radius: 999px; border: 1.5px solid var(--dm-border-strong, #cbd5e1); background: var(--dm-surface, white);
  font-size: 12px; font-weight: 600; color: var(--dm-text-2, #475569); cursor: pointer;
}
.mpm-chip--active { border-color: #2e5396; background: var(--dm-tint-blue, #dbeafe); color: var(--dm-accent, #1e3a8a); }
.mpm-empty-note { font-size: 11.5px; color: var(--dm-faint, #94a3b8); font-style: italic; }
.mpm-jig-add { display: flex; gap: 6px; }
.mpm-jig-add input { flex: 1; padding: 6px 9px; border-radius: 6px; border: 1.5px solid var(--dm-border, #e2e8f0); font-size: 12px; }
.mpm-jig-add button {
  padding: 6px 12px; border-radius: 6px; border: 1.5px solid #d97706; background: var(--dm-surface, white); color: #d97706;
  font-size: 12px; font-weight: 700; cursor: pointer;
}

.mpm-ckd-preview { margin-top: 12px; display: flex; flex-direction: column; gap: 4px; }
.mpm-ckd-line { font-size: 11.5px; color: var(--dm-faint, #94a3b8); display: flex; align-items: center; gap: 5px; }
.mpm-ckd-line--info { color: #d97706; background: var(--dm-tint-amber, #fffbeb); border: 1px solid var(--dm-bd-amber, #fde68a); border-radius: 6px; padding: 6px 9px; }

.mpm-backup-panel { margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--dm-border, #e2e8f0); }
.mpm-backup-sub { font-weight: 500; color: var(--dm-faint, #94a3b8); text-transform: none; letter-spacing: 0; }
.mpm-backup-error {
  display: flex; align-items: center; gap: 6px; background: var(--dm-tint-red, #fef2f2); border: 1px solid var(--dm-bd-red, #fecaca);
  color: var(--dm-on-red, #dc2626); font-size: 11.5px; padding: 7px 10px; border-radius: 6px; margin-bottom: 8px;
}
.mpm-backup-locked {
  display: flex; align-items: center; gap: 6px; background: var(--dm-tint-amber, #fffbeb); border: 1px solid var(--dm-bd-amber, #fde68a);
  color: var(--dm-on-amber, #92400e); font-size: 11.5px; padding: 7px 10px; border-radius: 6px;
}

.mpm-manual-toggle {
  margin-top: 14px; display: inline-flex; align-items: center; gap: 4px; border: none; background: none;
  color: var(--dm-muted, #64748b); font-size: 11.5px; text-decoration: underline; cursor: pointer; padding: 0;
}
.mpm-manual-input {
  width: 100%; padding: 8px 10px; border-radius: 6px; border: 1.5px solid var(--dm-border, #e2e8f0); font-size: 13px;
  box-sizing: border-box; margin-bottom: 10px;
}

.mpm-footer {
  border-top: 1px solid var(--dm-border, #e2e8f0); padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.mpm-preview { margin: 0; font-size: 12.5px; color: var(--dm-text, #1e293b); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mpm-footer-actions { display: flex; gap: 8px; flex-shrink: 0; }
.mpm-btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1.5px solid transparent; }
.mpm-btn--ghost { border-color: var(--dm-border-strong, #cbd5e1); background: var(--dm-surface, white); color: var(--dm-text-2, #475569); }
.mpm-btn--ghost:hover { background: var(--dm-bg, #f1f5f9); }
.mpm-btn--primary { background: #2e5396; color: white; }
.mpm-btn--primary:hover { filter: brightness(1.08); }
.mpm-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }

.mpm-fade-enter-active, .mpm-fade-leave-active { transition: opacity 0.15s; }
.mpm-fade-enter-from, .mpm-fade-leave-to { opacity: 0; }
</style>
