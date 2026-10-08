<script setup lang="ts">
import { alertDialog, confirmDialog } from '@/utils/dialog';
// AreaMachinePicker — picker mesin untuk form Tambah/Edit Part WELDING, berbasis
// master AREA baru (WSS/CO/SA × plant) + denah 2D `Area & Mesin` (ms_welding_machine
// pos_x/pos_y). Satu sumber data dengan halaman Area & Mesin (weldingAreaService).
//
// Mode:
//  - 'main' : mesin utama → kolom ms_welding.machine. Mode ROBOT (isRobotSetup):
//             1 mesin; di area SA sekalian pilih JIG (slot) mesin itu → ms_welding.jig.
//             Lainnya (WSS / mesin manual): urutan multi-proses "A1 A2" (format lama).
//  - 'alt'  : mesin alternatif → kolom ms_welding.machine_alt, pilih bebas (multi).
// Mesin yang dipilih menentukan ZONE (= nilai kolom `area` lama) — dikirim balik
// lewat payload.zone supaya form mengisi `area` otomatis.
import { ref, computed, watch } from 'vue'
import { vModalStack } from '@/directives/modalStack'
import weldingAreaService, { type AreaMachine, nextJigCode } from '@/services/Public/Welding/weldingAreaService'
import machineMapService from '@/services/Public/Welding/machineMapService'
import { useAreaColor } from '@/composables/useAreaColor'
import { isRobotSetup } from '@/composables/useWeldingAreas'

const props = defineProps<{
  modelValue: boolean
  areaCode: string | null | undefined   // area BARU (mis. 'SA ADM')
  mode: 'main' | 'alt'
  initialMachine?: string | null
  initialJig?: string | null
  excludeMachine?: string | null        // mode alt: mesin utama, tidak boleh dipilih lagi
}>()
const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  apply: [payload: { machine: string; zone: string | null; total_proses: number; jig: string | null }]
}>()
const { getStyle } = useAreaColor()

const loading = ref(false)
const zones = ref<string[]>([])
const machines = ref<AreaMachine[]>([])
const sequence = ref<string[]>([])
const search = ref('')

const activeMachines = computed(() => machines.value.filter(m => m.is_active))
const placed = computed(() => activeMachines.value.filter(m => m.pos_x !== null && m.pos_y !== null))
const unplaced = computed(() => activeMachines.value.filter(m => m.pos_x === null || m.pos_y === null))
const canvasW = computed(() => Math.max(600, ...placed.value.map(m => (m.pos_x ?? 0) + 96)))
const canvasH = computed(() => Math.max(200, ...placed.value.map(m => (m.pos_y ?? 0) + 64)))
const listFiltered = computed(() => {
  const q = search.value.trim().toUpperCase()
  return q ? activeMachines.value.filter(m => m.machine.toUpperCase().includes(q) || (m.machine_name ?? '').toUpperCase().includes(q)) : activeMachines.value
})

/** Zone dari mesin terpilih pertama — semua mesin 1 part harus 1 zone. */
const selectedZone = computed(() => {
  const first = sequence.value[0]
  return activeMachines.value.find(m => m.machine === first)?.area_code ?? null
})
const isRobotZone = computed(() => !!selectedZone.value && isRobotSetup(selectedZone.value, sequence.value[0]))
const singleSelect = computed(() => props.mode === 'main' && isRobotZone.value)

// ── JIG (hanya area SA, mesin robot) — jig = slot di mesin, ikut mesin terpilih ──
const selectedJig = ref<string | null>(null)
const savingJig = ref(false)
const jigEnabled = computed(() => singleSelect.value && (selectedZone.value ?? '').startsWith('SA '))
const jigMachine = computed(() => jigEnabled.value ? activeMachines.value.find(m => m.machine === sequence.value[0]) ?? null : null)
const jigList = computed(() => jigMachine.value?.jigs ?? [])
let loadingInitial = false                           // load(): pertahankan initialJig
watch(() => sequence.value[0], () => {
  if (loadingInitial) return
  selectedJig.value = null
  if (jigList.value.length === 1) selectedJig.value = jigList.value[0].code
})
const nextJig = computed(() => nextJigCode(jigList.value))
/** Tambah jig nomor berikutnya (1, 2, 3, ...) ke master & langsung pilih. Sunting/hapus di Area & Mesin. */
async function addJig() {
  const m = jigMachine.value
  if (!m || !selectedZone.value) return
  const code = nextJig.value
  savingJig.value = true
  try {
    const res = await machineMapService.saveJig({ area_scope: selectedZone.value, machine: m.machine, jig_code: code, is_active: true, sort_order: Number(code) })
    if (!res.success) { alertDialog(res.message || 'Gagal menambah jig.'); return }
    m.jigs = [...(m.jigs ?? []), { id: null, code, parts: [] }]
    selectedJig.value = code
  } catch (e: any) { alertDialog(e?.response?.data?.message ?? 'Gagal menambah jig.') }
  finally { savingJig.value = false }
}

function seqIndex(m: string) { return sequence.value.indexOf(m) }
function isDisabled(m: AreaMachine) {
  if (props.mode === 'alt' && props.excludeMachine && props.excludeMachine.split(/\s+/).includes(m.machine)) return true
  // Mesin utama: semua mesin harus 1 zone (kolom `area` cuma 1 nilai)
  return props.mode === 'main' && !!selectedZone.value && m.area_code !== selectedZone.value && seqIndex(m.machine) === -1
}
function toggle(m: AreaMachine) {
  if (isDisabled(m)) return
  const i = seqIndex(m.machine)
  if (i !== -1) { sequence.value.splice(i, 1); return }
  if (props.mode === 'main' && isRobotSetup(m.area_code, m.machine)) { sequence.value = [m.machine]; return }
  // Area campuran (SA ADM): mesin robot sudah terpilih → mesin manual menggantikannya.
  if (props.mode === 'main' && singleSelect.value) { sequence.value = [m.machine]; return }
  sequence.value.push(m.machine)
}

async function load() {
  sequence.value = props.initialMachine ? props.initialMachine.trim().split(/\s+/).filter(Boolean) : []
  selectedJig.value = props.initialJig ?? null
  search.value = ''
  loadingInitial = true
  if (!props.areaCode) { zones.value = []; machines.value = []; loadingInitial = false; return }
  loading.value = true
  try {
    const r = await weldingAreaService.machines(props.areaCode)
    zones.value = r.zones; machines.value = r.machines
  } catch { zones.value = []; machines.value = [] }
  finally { loading.value = false; loadingInitial = false }
}
watch(() => props.modelValue, v => { if (v) load() })

function close() { emit('update:modelValue', false) }
function apply() {
  emit('apply', { machine: sequence.value.join(' '), zone: selectedZone.value, total_proses: sequence.value.length,
                  jig: jigEnabled.value ? selectedJig.value : null })
  close()
}
function clearAll() { sequence.value = [] }
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" v-modal-stack="close" class="amp-overlay" @click.self.prevent>
      <div class="amp-modal">
        <header class="amp-head">
          <div>
            <h3><i class="mdi" :class="mode === 'main' ? 'mdi-factory' : 'mdi-swap-horizontal'"></i> {{ mode === 'main' ? 'Mesin Utama' : 'Mesin Alternatif' }}</h3>
            <p>Area <strong>{{ areaCode || '—' }}</strong>
              <span v-if="mode === 'main'"> · robot = 1 mesin; WSS = klik berurutan (multi-proses)</span>
              <span v-else> · bisa lebih dari 1 mesin</span>
            </p>
          </div>
          <button type="button" class="amp-x" @click="close"><i class="mdi mdi-close"></i></button>
        </header>

        <div v-if="loading" class="amp-empty"><i class="mdi mdi-loading mdi-spin"></i> Memuat mesin…</div>
        <div v-else-if="!areaCode" class="amp-empty">Pilih area dulu.</div>
        <div v-else-if="!activeMachines.length" class="amp-empty">Belum ada mesin aktif di area ini. Tambahkan lewat menu <strong>Area &amp; Mesin</strong>.</div>

        <div v-else class="amp-body">
          <!-- Denah 2D (sumber: Area & Mesin) -->
          <div class="amp-canvas-wrap">
            <div class="amp-canvas" :style="{ width: canvasW + 'px', height: canvasH + 'px' }">
              <button
                v-for="m in placed" :key="m.id" type="button"
                class="amp-mc" :class="{ 'amp-mc--sel': seqIndex(m.machine) !== -1, 'amp-mc--dis': isDisabled(m) }"
                :style="{ left: m.pos_x + 'px', top: m.pos_y + 'px', ...getStyle(m.area_code) }"
                :title="isDisabled(m) ? (mode === 'alt' ? 'Sudah jadi mesin utama' : 'Tidak bisa digabung dengan mesin yang sudah dipilih') : `${m.machine}${m.machine_name ? ' — ' + m.machine_name : ''} · ${m.part_count} part`"
                @click="toggle(m)"
              >
                <span class="amp-mc-code">{{ m.machine }}</span>
                <span v-if="m.machine_name" class="amp-mc-zone">{{ m.machine_name }}</span>
                <span v-if="seqIndex(m.machine) !== -1 && !singleSelect" class="amp-mc-seq">{{ seqIndex(m.machine) + 1 }}</span>
                <i v-else-if="seqIndex(m.machine) !== -1" class="mdi mdi-check-bold amp-mc-check"></i>
              </button>
              <div v-if="!placed.length" class="amp-canvas-empty">Denah belum diatur — pilih dari daftar di kanan.</div>
            </div>
          </div>

          <!-- Daftar (cari cepat + mesin belum di denah) -->
          <aside class="amp-list">
            <div class="amp-search"><i class="mdi mdi-magnify"></i><input v-model="search" placeholder="Cari mesin…"></div>
            <div class="amp-list-scroll">
              <button
                v-for="m in listFiltered" :key="m.id" type="button"
                class="amp-row" :class="{ 'amp-row--sel': seqIndex(m.machine) !== -1, 'amp-row--dis': isDisabled(m) }"
                :style="getStyle(m.area_code)" @click="toggle(m)"
              >
                <span class="amp-row-code">{{ m.machine }}</span>
                <span class="amp-row-zone">{{ m.machine_name || '' }}</span>
                <span class="amp-row-parts">{{ m.part_count }}p</span>
                <i v-if="unplaced.includes(m)" class="mdi mdi-map-marker-off-outline amp-row-nomap" title="Belum di denah"></i>
              </button>
            </div>
          </aside>
        </div>

        <!-- Jig mesin robot (area SA): slot di mesin + part yang sudah memakainya -->
        <div v-if="jigEnabled && jigMachine" class="amp-jig">
          <span class="amp-jig-label"><i class="mdi mdi-vector-square"></i> Jig {{ jigMachine.machine }}</span>
          <button
            v-for="j in jigList" :key="j.code" type="button"
            class="amp-jig-chip" :class="{ 'amp-jig-chip--sel': selectedJig === j.code }"
            :title="j.parts.length ? 'Dipakai: ' + j.parts.join(', ') : 'Belum dipakai part'"
            @click="selectedJig = selectedJig === j.code ? null : j.code"
          >
            <strong>{{ j.code }}</strong><small>{{ j.parts.length }} part</small>
          </button>
          <span v-if="!jigList.length" class="amp-muted">Mesin ini belum punya jig.</span>
          <button type="button" class="amp-btn amp-jig-add" :disabled="savingJig" title="Sunting / hapus jig di menu Area & Mesin" @click="addJig">
            <i class="mdi" :class="savingJig ? 'mdi-loading mdi-spin' : 'mdi-plus'"></i> Jig {{ nextJig }}
          </button>
        </div>

        <footer class="amp-foot">
          <div class="amp-sel">
            <template v-if="sequence.length">
              <span v-for="(m, i) in sequence" :key="m" class="amp-chip"><small v-if="!singleSelect">{{ i + 1 }}</small>{{ m }}</span>
              <span v-if="jigEnabled && selectedJig" class="amp-chip amp-chip--jig">Jig {{ selectedJig }}</span>

            </template>
            <span v-else class="amp-muted">Belum ada mesin dipilih</span>
          </div>
          <button type="button" class="amp-btn" @click="clearAll" :disabled="!sequence.length">Kosongkan</button>
          <button type="button" class="amp-btn" @click="close">Batal</button>
          <button type="button" class="amp-btn amp-btn--primary" @click="apply">Terapkan</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* z-index di atas form modal master-data (.modal-overlay 99990) + nested-nya (≤99996) — dulu 10050, tampil DI BELAKANG form edit part. */
.amp-overlay { position: fixed; inset: 0; z-index: 99997; background: rgba(15, 23, 42, 0.55); display: grid; place-items: center; padding: 16px; }
.amp-modal { background: var(--dm-surface, white); border-radius: 12px; width: min(1100px, 100%); max-height: 92vh; display: flex; flex-direction: column; box-shadow: 0 24px 60px rgba(0,0,0,0.3); overflow: hidden; }
.amp-head { display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--dm-border, #e2e8f0); background: var(--dm-surface2, #f8fafc); }
.amp-head h3 { margin: 0; font-size: 15px; font-weight: 800; color: var(--dm-text, #1e293b); display: flex; align-items: center; gap: 6px; }
.amp-head p { margin: 2px 0 0; font-size: 11.5px; color: var(--dm-muted, #64748b); }
.amp-x { margin-left: auto; border: none; background: transparent; font-size: 20px; color: var(--dm-faint, #94a3b8); cursor: pointer; }
.amp-x:hover { color: var(--dm-text, #1e293b); }
.amp-empty { padding: 40px; text-align: center; color: var(--dm-muted, #64748b); font-size: 13px; }
.amp-body { display: grid; grid-template-columns: minmax(0, 1fr) 260px; min-height: 0; flex: 1; }
.amp-canvas-wrap { overflow: auto; background: var(--dm-bg, #f1f5f9); padding: 12px; }
.amp-canvas {
  position: relative; background-color: var(--dm-surface2, #f8fafc); border: 1.5px solid var(--dm-border-strong, #cbd5e1); border-radius: 6px;
  background-image: linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px); background-size: 50px 50px;
}
.amp-canvas-empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--dm-faint, #94a3b8); font-size: 12px; font-style: italic; }
.amp-mc {
  position: absolute; width: 76px; height: 44px; box-sizing: border-box; cursor: pointer; font-family: inherit;
  background: var(--dm-surface, white); border: 2px solid var(--area-border); border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15); transition: transform 0.1s, box-shadow 0.1s;
}
.amp-mc:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
.amp-mc--sel { background: var(--area-border); color: white; }
.amp-mc--sel .amp-mc-code, .amp-mc--sel .amp-mc-zone { color: white; background: transparent; }
.amp-mc--dis { opacity: 0.35; cursor: not-allowed; }
.amp-mc-code { font-weight: 800; font-size: 13px; color: var(--area-text); }
.amp-mc-zone { font-size: 8px; font-weight: 600; color: var(--dm-muted, #64748b); margin-top: 2px; max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.amp-mc-seq, .amp-mc-check { position: absolute; top: -8px; right: -8px; width: 18px; height: 18px; border-radius: 50%; background: #f59e0b; color: var(--dm-text, #1a1a1a); font-size: 10px; font-weight: 800; display: grid; place-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
.amp-list { border-left: 1px solid var(--dm-border, #e2e8f0); display: flex; flex-direction: column; min-height: 0; }
.amp-search { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-bottom: 1px solid var(--dm-border, #e2e8f0); color: var(--dm-faint, #94a3b8); }
.amp-search input { flex: 1; border: none; outline: none; font-size: 12px; font-family: inherit; }
.amp-list-scroll { overflow-y: auto; flex: 1; padding: 6px; }
.amp-row { width: 100%; display: flex; align-items: center; gap: 6px; padding: 5px 8px; border: 1px solid transparent; border-left: 3px solid var(--area-border); border-radius: 6px; background: var(--dm-surface, white); cursor: pointer; font-family: inherit; text-align: left; margin-bottom: 3px; }
.amp-row:hover { background: var(--area-bg); }
.amp-row--sel { background: var(--area-pill); border-color: var(--area-border); }
.amp-row--dis { opacity: 0.4; cursor: not-allowed; }
.amp-row-code { font-weight: 800; font-size: 12px; color: var(--dm-text, #1e293b); min-width: 52px; }
.amp-row-zone { font-size: 10px; color: var(--area-text); font-weight: 600; flex: 1; }
.amp-row-parts { font-size: 10px; color: var(--dm-faint, #94a3b8); }
.amp-row-nomap { color: #d97706; font-size: 12px; }
.amp-foot { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-top: 1px solid var(--dm-border, #e2e8f0); background: var(--dm-surface2, #f8fafc); }
.amp-sel { flex: 1; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.amp-chip { background: #2e5396; color: white; border-radius: 99px; padding: 2px 9px; font-size: 11.5px; font-weight: 700; display: inline-flex; gap: 4px; align-items: center; }
.amp-chip small { background: #f59e0b; color: var(--dm-text, #1a1a1a); border-radius: 50%; width: 14px; height: 14px; display: grid; place-items: center; font-size: 9px; }
.amp-zone-tag { font-size: 10.5px; color: var(--dm-muted, #64748b); margin-left: 4px; }
.amp-muted { color: var(--dm-faint, #94a3b8); font-size: 12px; }
.amp-chip--jig { background: #0f766e; }
.amp-jig { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 10px 18px; border-top: 1px solid var(--dm-border, #e2e8f0); background: var(--dm-tint-teal, #f0fdfa); }
.amp-jig-label { font-size: 12px; font-weight: 800; color: var(--dm-on-teal, #0f766e); display: inline-flex; align-items: center; gap: 4px; margin-right: 4px; }
.amp-jig-chip { display: inline-flex; flex-direction: column; align-items: center; min-width: 52px; padding: 4px 10px; border: 1.5px solid var(--dm-bd-green, #99f6e4); border-radius: 8px; background: var(--dm-surface, white); color: #134e4a; cursor: pointer; font-family: inherit; line-height: 1.15; }
.amp-jig-chip strong { font-size: 14px; }
.amp-jig-chip small { font-size: 10px; color: var(--dm-muted, #64748b); }
.amp-jig-chip:hover { border-color: #14b8a6; }
.amp-jig-chip--sel { background: #0f766e; border-color: #0f766e; color: white; }
.amp-jig-chip--sel small { color: #ccfbf1; }
.amp-jig-add { margin-left: auto; }
.amp-btn { border: 1px solid var(--dm-border-strong, #cbd5e1); background: var(--dm-surface, white); color: var(--dm-cell, #334155); border-radius: 7px; padding: 6px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
.amp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.amp-btn--primary { background: #2e5396; border-color: #2e5396; color: white; }
@media (max-width: 800px) { .amp-body { grid-template-columns: 1fr; } .amp-list { border-left: none; border-top: 1px solid var(--dm-border, #e2e8f0); max-height: 200px; } }
</style>
