<!-- views/public/welding/plan/lkh.vue — LKH dual-shift (rekonstruksi) -->
<template>
    <div class="page">
        <!-- Header -->
        <div class="page-header">
            <div class="header-left">
                <span class="page-icon"><i class="ti ti-file-description"></i></span>
                <div>
                    <h1 class="page-title">Laporan Kerja Harian (LKH)</h1>
                    <p class="page-sub">{{ areaName }} · {{ formattedDate }} · {{ viewLabel }}</p>
                </div>
            </div>

            <div class="header-right">
                <div class="date-shift-wrap">
                    <label class="ds-label">Tanggal</label>
                    <input type="date" v-model="selectedDate" @change="loadData" class="ds-input" />
                </div>
                <div class="area-dropdown-wrap" ref="areaDropdownRef">
                    <button class="btn-area" @click="showAreaDropdown = !showAreaDropdown">
                        <i class="ti ti-map-pin" style="font-size:14px"></i>
                        {{ areaName }}
                        <i class="ti ti-chevron-down" :class="{ rotated: showAreaDropdown }"></i>
                    </button>
                    <div v-if="showAreaDropdown" class="area-dropdown">
                        <div class="area-dropdown-title">Pilih LKH (per Foreman)</div>
                        <!-- Grup LKH = 1 foreman; bisa gabungan >1 area master (utils/lkhGroups). -->
                        <template v-for="p in groupsByPlant" :key="p.plant">
                            <div class="area-group-title">{{ p.plant }}</div>
                            <button v-for="g in p.groups" :key="g.code" class="area-item nested"
                                :class="{ active: g.code === group.code }" @click="selectGroup(g)">
                                <i class="ti ti-check" :class="{ invisible: g.code !== group.code }"></i>
                                {{ g.label }}
                            </button>
                        </template>
                    </div>
                </div>


                <!-- Saklar tampilan — 1 bar ringkas:
                     Shift  : Day+Night (Per Day, tanpa PATAN) | Day | Night (Per Shift + PATAN)
                     OP     : Gabung (1 baris/part) | Pisah (1 baris/proses, actual di OP terakhir)
                     Actual : Server (Achievement v2) | Kosong (form isi tangan) -->
                <div class="vbar" role="toolbar" aria-label="Tampilan LKH">
                    <div class="vgrp" role="group" aria-label="Shift">
                        <span class="vlbl">Shift</span>
                        <button v-for="o in SHIFT_OPTS" :key="o.v" class="vbtn" :class="{ on: shiftView === o.v }"
                            :title="o.tip" @click="shiftView = o.v">{{ o.label }}</button>
                    </div>
                    <div class="vgrp" role="group" aria-label="Baris per OP">
                        <span class="vlbl">OP</span>
                        <button class="vbtn" :class="{ on: !splitOp }" title="1 baris per part (mesin digabung)" @click="splitOp = false">Gabung</button>
                        <button class="vbtn" :class="{ on: splitOp }" title="1 baris per proses OP10, OP20, ... — actual & edit di OP terakhir" @click="splitOp = true">Pisah</button>
                    </div>
                    <div class="vgrp" role="group" aria-label="Sumber actual">
                        <span class="vlbl">Actual</span>
                        <button class="vbtn" :class="{ on: !blankActual }" title="Actual dari Achievement v2" @click="blankActual = false">Server</button>
                        <button class="vbtn" :class="{ on: blankActual }" title="Actual kosong — cetak form untuk diisi tangan foreman" @click="blankActual = true">Kosong</button>
                    </div>
                </div>

                <button class="btn-reload" :disabled="loading" @click="loadData">
                    <i class="ti" :class="loading ? 'ti-loader-2 spin' : 'ti-refresh'"></i>
                    {{ loading ? 'Memuat...' : 'Refresh' }}
                </button>

                <LKHPrint :data="rows" :date="selectedDate" :group="group" :show-patan="showPatan" :shifts="shifts" :blank-actual="blankActual" :show-op="splitOp" />
            </div>
        </div>

        <!-- Info strip -->
        <div v-if="lastUpdatedLabel || error" class="info-strip">
            <span v-if="lastUpdatedLabel" class="info-ts"><i class="ti ti-clock"></i> Dimuat: <strong>{{ lastUpdatedLabel }}</strong></span>
            <span v-if="error" class="info-err"><i class="ti ti-alert-circle"></i> {{ error }}</span>
            <span class="info-live" :class="socketConnected ? 'info-live--on' : 'info-live--off'">
                <i class="ti" :class="socketConnected ? 'ti-live-view' : 'ti-plug-x'"></i>
                {{ socketConnected ? 'Realtime' : 'Offline' }}
            </span>
        </div>

        <!-- Summary cards — plan (mutasi) vs actual (Achievement v2) per shift -->
        <div class="metrics-row">
            <div class="metric-card"><div class="metric-label">Total Part</div><div class="metric-value">{{ summary?.total_parts ?? 0 }}</div></div>
            <div v-if="showPatan" class="metric-card">
                <div class="metric-label">Patan</div>
                <div class="metric-value accent-violet">{{ fmtN(patanLot) }} <span class="unit">pcs · {{ fmtN(patanKbn) }} kbn</span></div>
            </div>
            <template v-if="shifts.includes('day')">
            <div class="metric-card">
                <div class="metric-label">Plan Day</div>
                <div class="metric-value accent-blue">{{ fmtN(summary?.total_day_lot) }} <span class="unit">pcs · {{ summary?.total_day_kbn ?? 0 }} kbn</span></div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Actual Day</div>
                <div class="metric-value accent-green"><template v-if="blankActual">—</template><template v-else>{{ fmtN(summary?.total_day_act) }} <span class="unit">pcs · {{ pct(summary?.total_day_act, summary?.total_day_lot) }}</span></template></div>
            </div>
            </template>
            <template v-if="shifts.includes('night')">
            <div class="metric-card">
                <div class="metric-label">Plan Night</div>
                <div class="metric-value accent-slate">{{ fmtN(summary?.total_night_lot) }} <span class="unit">pcs · {{ summary?.total_night_kbn ?? 0 }} kbn</span></div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Actual Night</div>
                <div class="metric-value accent-green"><template v-if="blankActual">—</template><template v-else>{{ fmtN(summary?.total_night_act) }} <span class="unit">pcs · {{ pct(summary?.total_night_act, summary?.total_night_lot) }}</span></template></div>
            </div>
            </template>
            <div class="metric-card">
                <div class="metric-label">Sumber</div>
                <div class="metric-src"><span class="src-chip src-plan">Plan: Mutasi</span><span class="src-chip src-act">Actual: {{ blankActual ? 'Kosong (isi tangan)' : 'Achievement v2' }}</span></div>
            </div>
        </div>

        <!-- Table -->
        <div class="table-area">
            <div v-if="loading" class="state-box">
                <i class="ti ti-loader-2 spin state-icon" style="color:#2563EB"></i>
                <p class="state-text">Memuat data LKH...</p>
            </div>
            <div v-else-if="error && !hasData" class="state-box">
                <i class="ti ti-alert-circle state-icon" style="color:#DC2626"></i>
                <p class="state-text text-red">{{ error }}</p>
                <button class="btn-retry" @click="loadData"><i class="ti ti-refresh"></i> Coba Lagi</button>
            </div>
            <div v-else-if="!hasData" class="state-box">
                <i class="ti ti-table-off state-icon" style="color:#9CA3AF"></i>
                <p class="state-text">Data LKH belum tersedia</p>
                <p class="state-sub">Pastikan planning (mutasi) untuk tanggal ini sudah di-refresh.</p>
            </div>
            <LKHDualTable v-else :data="rows" :show-patan="showPatan" :shifts="shifts"
                :group="group" :blank-actual="blankActual" :show-op="splitOp" @actual="handleActual" />
        </div>

        <!-- Toast -->
        <Transition name="toast">
            <div v-if="toastMessage" class="toast-box" :class="toastType === 'success' ? 'toast-success' : 'toast-error'">
                <i class="ti" :class="toastType === 'success' ? 'ti-check' : 'ti-alert-circle'"></i>
                {{ toastMessage }}
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LKHDualTable from '@/components/welding/lkh/LKHDualTable.vue'
import LKHPrint from '@/components/welding/lkh/LKHPrint.vue'
import { useLKHDual } from '@/composables/useLKHDual'
import { useLKHRealtime } from '@/composables/useLKHRealtime'
import { LKH_GROUPS, DEFAULT_LKH_GROUP, lkhGroupByCode, splitByOp, type LKHGroup } from '@/utils/lkhGroups'
import { PLANT_ORDER } from '@/composables/useWeldingAreas'
import type { LKHDualField, LKHShiftKey } from '@/types/Public/Welding/lkh'

const route = useRoute()
const router = useRouter()

// Grup LKH = 1 foreman (ADM 3, MMKI 1, HMMI 1). Tiap baris membawa `area` (area master)
// untuk simpan actual.
const group = ref<LKHGroup>(DEFAULT_LKH_GROUP)
const areaName = computed(() => group.value.label)
const selectedDate = ref('')

const groupsByPlant = PLANT_ORDER
    .map(plant => ({ plant, groups: LKH_GROUPS.filter(g => g.plant === plant) }))
    .filter(p => p.groups.length)

// ── Saklar Per Day / Per Shift ──────────────────────────────────
// Per Day  : DAY + NIGHT berdampingan (tanpa PATAN).
// Per Shift: 1 shift + kolom PATAN. Default shift = shift berjalan (Day 07:15–19:59).
type ViewMode = 'day' | 'shift'
const VIEW_KEY = 'lkh.viewMode'
const readView = (): ViewMode => { try { return localStorage.getItem(VIEW_KEY) === 'shift' ? 'shift' : 'day' } catch { return 'day' } }
const viewMode = ref<ViewMode>(readView())
watch(viewMode, v => { try { localStorage.setItem(VIEW_KEY, v) } catch { /* abaikan */ } })

// Saklar Actual: false = data server (Achievement v2), true = kosong (form diisi tangan).
const BLANK_KEY = 'lkh.blankActual'
const blankActual = ref<boolean>((() => { try { return localStorage.getItem(BLANK_KEY) === '1' } catch { return false } })())
watch(blankActual, v => { try { localStorage.setItem(BLANK_KEY, v ? '1' : '0') } catch { /* abaikan */ } })

// Saklar OP: false = 1 baris/part (mesin digabung), true = 1 baris per proses (utils/lkhGroups.splitByOp).
const SPLIT_KEY = 'lkh.splitOp'
const splitOp = ref<boolean>((() => { try { return localStorage.getItem(SPLIT_KEY) === '1' } catch { return false } })())
watch(splitOp, v => { try { localStorage.setItem(SPLIT_KEY, v ? '1' : '0') } catch { /* abaikan */ } })
const rows = computed(() => splitOp.value ? splitByOp(data.value) : data.value)

const currentShift = (): LKHShiftKey => {
    const t = new Date().getHours() * 60 + new Date().getMinutes()
    return t >= 435 && t <= 1199 ? 'day' : 'night'
}
const shift = ref<LKHShiftKey>(currentShift())
// 1 saklar Shift (3 pilihan) di atas state viewMode + shift yang sudah ada.
type ShiftView = 'both' | LKHShiftKey
const SHIFT_OPTS: { v: ShiftView; label: string; tip: string }[] = [
    { v: 'both',  label: 'Day+Night', tip: 'Per Day — Day & Night berdampingan' },
    { v: 'day',   label: 'Day',       tip: 'Per Shift Day + kolom PATAN' },
    { v: 'night', label: 'Night',     tip: 'Per Shift Night + kolom PATAN' },
]
const shiftView = computed<ShiftView>({
    get: () => viewMode.value === 'day' ? 'both' : shift.value,
    set: v => { if (v === 'both') viewMode.value = 'day'; else { viewMode.value = 'shift'; shift.value = v } },
})
const showPatan = computed(() => viewMode.value === 'shift')
const shifts = computed<LKHShiftKey[]>(() => viewMode.value === 'shift' ? [shift.value] : ['day', 'night'])
const viewLabel = computed(() => viewMode.value === 'day' ? 'Per Day' : `Shift ${shift.value === 'day' ? 'Day' : 'Night'}`)

const showAreaDropdown = ref(false)
const areaDropdownRef = ref<HTMLElement | null>(null)

function selectGroup(g: LKHGroup) {
    showAreaDropdown.value = false
    if (g.code === group.value.code) return
    router.push({ name: 'WeldingPlanLKH', params: { area: g.code } })   // watch route → load
}
function onClickOutside(e: MouseEvent) {
    if (areaDropdownRef.value && !areaDropdownRef.value.contains(e.target as Node)) showAreaDropdown.value = false
}

const formattedDate = computed(() => {
    if (!selectedDate.value) return '-'
    const [y, m, d] = selectedDate.value.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
})

const { data, summary, loading, error, hasData, lastUpdatedLabel, fetchLKH, silentRefresh, saveActual } = useLKHDual()

const fmtN = (v: number | null | undefined) => (Number(v) || 0).toLocaleString('id-ID')
const patanLot = computed(() => data.value.reduce((t, r) => t + (Number(r.patan?.lot_size) || 0), 0))
const patanKbn = computed(() => data.value.reduce((t, r) => t + (Number(r.patan?.kbn) || 0), 0))
const pct  = (a: number | null | undefined, b: number | null | undefined) => {
    const x = Number(a) || 0, y = Number(b) || 0
    return y > 0 ? Math.round(x / y * 100) + '%' : '—'
}

const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string, type: 'success' | 'error' = 'success') {
    toastMessage.value = msg; toastType.value = type
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toastMessage.value = '' }, 3000)
}

async function loadData() {
    if (!selectedDate.value) return
    await fetchLKH(selectedDate.value, group.value)
    if (error.value) showToast(error.value, 'error')
}

async function handleActual(p: { area: string; part_number: string; status: 'FP' | 'WIP'; shift: LKHShiftKey; field: LKHDualField; value: string | number | null }) {
    // Grup LKH bisa gabungan beberapa area → simpan ke area milik baris part ini.
    const res = await saveActual({ date: selectedDate.value, ...p })
    if (res.success) {
        showToast('Tersimpan', 'success')
        // Silent refresh — tidak trigger loading overlay
        await silentRefresh(selectedDate.value, group.value)
    } else {
        showToast(res.message ?? 'Gagal menyimpan', 'error')
    }
}

// Socket realtime — silent refresh saat Achievement v2 simpan actual (debounce 800ms)
const { connected: socketConnected } = useLKHRealtime(
    () => silentRefresh(selectedDate.value, group.value)
)

onMounted(async () => {
    document.addEventListener('click', onClickOutside)
    group.value = lkhGroupByCode(route.params.area as string) ?? DEFAULT_LKH_GROUP
    selectedDate.value = new Date().toISOString().split('T')[0]
    await loadData()
})
onUnmounted(() => {
    document.removeEventListener('click', onClickOutside)
})

watch(() => route.params.area, async (newArea) => {
    const g = lkhGroupByCode(newArea as string) ?? DEFAULT_LKH_GROUP
    if (g.code === group.value.code) return
    group.value = g
    await loadData()
})
</script>

<style scoped>
.page {
  position: fixed;
  top: var(--v-layout-top, 0px);
  left: var(--v-layout-left, 0px);
  right: 0;
  bottom: var(--v-layout-bottom, 0px);
  z-index: 1;
  overflow-y: auto;
  background: #f5f5f3;
  /* Halaman LKH = dokumen kerja, selalu skema terang (cermin cetakan). Tanpa ini dark mode
     mewariskan teks putih ke sel tabel berlatar terang → angka tak terlihat. */
  color: #1a1a1a;
  color-scheme: light;
  padding: 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
}
.page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 4px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.page-icon { width: 40px; height: 40px; border-radius: 10px; background: #E0F2FE; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #0369A1; }
.page-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin: 0; }
.page-sub { font-size: 12px; color: #888; margin: 3px 0 0; }

.area-dropdown-wrap { position: relative; }
.btn-area { display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #D1D5DB; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; }
.btn-area:hover { background: #F3F4F6; }
.btn-area .rotated { transform: rotate(180deg); }
.area-dropdown { position: absolute; right: 0; top: calc(100% + 4px); background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.12); z-index: 1000; min-width: 200px; overflow: hidden; }
.area-dropdown-title { padding: 8px 12px 6px; font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid #F3F4F6; }
.area-item { width: 100%; display: flex; align-items: center; gap: 8px; padding: 9px 12px; text-align: left; background: none; border: none; font-size: 13px; color: #374151; cursor: pointer; }
.area-item:hover { background: #F0F9FF; }
.area-item.active { color: #2563EB; font-weight: 700; background: #EFF6FF; }
.area-item.nested { padding-left: 18px; }
.area-group-title { padding: 8px 12px 2px; font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: .05em; }
.invisible { visibility: hidden; }

.vbar { display: flex; align-items: center; height: 34px; background: #fff; border: 1px solid #D1D5DB; border-radius: 8px; padding: 0 3px; }
.vgrp { display: flex; align-items: center; gap: 2px; padding: 0 6px; height: 100%; }
.vgrp + .vgrp { border-left: 1px solid #E5E7EB; }
.vlbl { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: .04em; margin-right: 4px; }
.vbtn { display: flex; align-items: center; gap: 4px; height: 26px; border: none; background: none; padding: 0 9px; border-radius: 6px; font-size: 12px; font-weight: 600; color: #6B7280; cursor: pointer; white-space: nowrap; }
.vbtn:hover:not(.on) { background: #F3F4F6; color: #374151; }
.vbtn.on { background: #2563EB; color: #fff; }

.date-shift-wrap { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #D1D5DB; padding: 6px 12px; border-radius: 8px; }
.ds-label { font-size: 11px; font-weight: 600; color: #6B7280; }
.ds-input { font-size: 12px; border: 1px solid #E5E7EB; border-radius: 6px; padding: 4px 8px; color: #374151; background: #FAFAFA; outline: none; }

.btn-reload { display: flex; align-items: center; gap: 6px; background: #2563EB; color: #fff; padding: 7px 14px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-reload:hover:not(:disabled) { background: #1D4ED8; }
.btn-reload:disabled { opacity: .55; cursor: not-allowed; }

.info-strip { display: flex; align-items: center; gap: 16px; font-size: 12px; color: #6B7280; background: #fff; border: 1px solid #E5E7EB; padding: 6px 16px; border-radius: 10px; }
.info-ts { display: flex; align-items: center; gap: 5px; }
.info-err { display: flex; align-items: center; gap: 5px; color: #DC2626; }
.info-live { display: flex; align-items: center; gap: 5px; margin-left: auto; font-weight: 600; font-size: 11px; }
.info-live--on  { color: #059669; }
.info-live--off { color: #9CA3AF; }

.metrics-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px; }
.metric-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; padding: 10px 14px; display: flex; flex-direction: column; justify-content: center; min-height: 64px; }
.metric-label { font-size: 10px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 2px; }
.metric-value { font-size: 20px; font-weight: 700; color: #111827; line-height: 1; }
.metric-value .unit { font-size: 11px; font-weight: 600; color: #9CA3AF; }
.accent-blue { color: #2563EB; }
.accent-slate { color: #475569; }
.accent-green { color: #059669; }
.accent-violet { color: #6D28D9; }
.metric-src { display: flex; flex-direction: column; gap: 4px; }
.src-chip { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; width: fit-content; }
.src-plan { background: #EFF6FF; color: #1E40AF; }
.src-act  { background: #ECFDF5; color: #065F46; }

.table-area { flex: 1; position: relative; min-height: 0; display: flex; flex-direction: column; }
.state-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 32px; text-align: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; }
.state-icon { font-size: 48px; margin-bottom: 16px; }
.state-text { font-size: 15px; font-weight: 600; color: #374151; margin: 0; }
.state-sub { font-size: 13px; color: #9CA3AF; margin: 6px 0 16px; }
.text-red { color: #DC2626; }
.btn-retry { margin-top: 12px; display: flex; align-items: center; gap: 6px; background: #2563EB; color: #fff; padding: 8px 18px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.toast-box { position: fixed; bottom: 24px; right: 24px; z-index: 99999; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.18); }
.toast-success { background: #059669; }
.toast-error { background: #DC2626; }
.toast-enter-active, .toast-leave-active { transition: all .3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
