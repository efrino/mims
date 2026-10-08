<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import { useAchievementWld } from '@/stores/Welding/Transaction/Achievement_v2';
import { storeToRefs } from 'pinia';
import { useWeldingAreas } from '@/composables/useWeldingAreas';
import type { Attendance, Detail, SummaryData, PartCandidate } from '@/types/Welding/Transaction/Achievement_v2';
import { useUtilityStore } from '@/stores/utility';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import CustomSelectSearch from '@/components/CustomSelectSearch.vue';
import PartPickerMutasi from '@/components/welding/Production/PartPickerMutasi.vue';
import OpSplitToggle from '@/components/welding/Production/OpSplitToggle.vue';
import { midOps, lastOp } from '@/utils/achOps';
import { lookupPartMaster, listPartCandidates, updatePlanLotsize, closeFormEditBeacon } from '@/services/Welding/Transaction/Achievement_v2';
import socket from '@/plugins/socket';

const storeAch = useAchievementWld();
const {
  cleanData,
  selectedPrefixArea,
  selectedArea,
  partData,
  formEdit,
  currentPatan,
  filter,
  permissions,
  keteranganActual,
  keteranganPlan,
  currentUser,
  isModalEditOpen,
  splitOp
} = storeToRefs(storeAch);

const utils = useUtilityStore();
const authStore = useAuthStore();
const notif = useNotificationStore();

// ── Lock form: modal hanya terbuka bila lock milik kita (dijaga di view). ──
// Di sini: heartbeat agar lock tidak basi, dan "ditendang" bila diambil alih.
const me = computed(() => authStore.user?.username || '');
const iAmAdmin = computed(() => me.value.toLowerCase() === 'administrator');
const lockedByOther = computed(() => !!currentUser.value.user && currentUser.value.user !== me.value);

const HEARTBEAT_MS = 45000;
let hbTimer: ReturnType<typeof setInterval> | null = null;
const lockLostBanner = ref<string | null>(null);   // pesan bila lock hilang / diambil alih

const onLockLost = async (by: string, reason: 'takeover' | 'stale') => {
  if (!isModalEditOpen.value) return;
  stopHeartbeat();
  lockLostBanner.value = reason === 'takeover'
    ? `Form diambil alih oleh ${by}. Perubahan yang belum disimpan tidak bisa disimpan.`
    : 'Koneksi lock terputus. Buka ulang form untuk melanjutkan.';
  notif.showDialogWarning('Form diambil alih', lockLostBanner.value);
  if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch (e) { /* ignore */ } }
  storeAch.isModalEditOpen = false;
};

const startHeartbeat = () => {
  stopHeartbeat();
  hbTimer = setInterval(async () => {
    if (!isModalEditOpen.value) return stopHeartbeat();
    const ok = await storeAch.heartbeat(selectedArea.value);
    if (!ok) onLockLost(currentUser.value.user || 'user lain', currentUser.value.user ? 'takeover' : 'stale');
  }, HEARTBEAT_MS);
};
const stopHeartbeat = () => { if (hbTimer) { clearInterval(hbTimer); hbTimer = null; } };

// Socket: user lain mengambil alih area ini → tutup modal seketika (tanpa menunggu heartbeat).
const onLockChanged = (p: any) => {
  if (!p || p.kind !== 'achLock') return;   // channel 'refreshAcievementWelding' dipakai bersama
  if (!isModalEditOpen.value || p.area !== selectedArea.value) return;
  if (p.date !== filter.value.date || String(p.shift) !== String(filter.value.shift)) return;
  // Takeover hanya relevan bila SLOT SAYA yang diambil (slot departemen lain tidak mengganggu).
  if (p.action === 'takeover' && p.locks) {
    for (const sl of storeAch.mySlots) {
      const l = p.locks[sl];
      if (l && l.user !== me.value) {
        currentUser.value = { status: false, user: l.user, messages: null, lock: l, locks: p.locks, is_me: false };
        onLockLost(l.fullname || l.user, 'takeover');
        return;
      }
    }
  }
  if (p.locks) currentUser.value = { ...currentUser.value, locks: p.locks };
};

// Tab ditutup / reload → lepas lock lewat beacon (heartbeat-timeout = jaring pengaman).
const onBeforeUnload = () => {
  if (!isModalEditOpen.value) return;
  closeFormEditBeacon(storeAch.lockKey(selectedArea.value), me.value);
};

// Label durasi "dibuka sejak"
const nowTick = ref(Date.now());
let tickTimer: ReturnType<typeof setInterval> | null = null;
// Chip presence header: editor (pemegang kunci, 1 akun) + pembuka View (banyak).
// Label "Dept · Edit/View". Saya → "Anda" (biru); editor lain → amber; viewer → abu.
const presenceChips = computed(() => {
  const l = currentUser.value.locks;
  const out: { user: string; label: string; mode: 'Edit' | 'View'; me: boolean; short: string; fullname: string | null; initials: string; isAdmin: boolean; since: string }[] = [];
  const seen = new Set<string>();
  const sinceOf = (at?: string) => {
    if (!at) return '';
    const m = Math.max(0, Math.floor((nowTick.value - Date.parse(at.replace(' ', 'T'))) / 60000));
    return m < 1 ? 'baru saja' : m < 60 ? `${m} mnt` : `${Math.floor(m / 60)} jam ${m % 60} mnt`;
  };
  const build = (user: string, fullname: string | null, isAdmin: boolean, dept: string | null | undefined, mode: 'Edit' | 'View', at?: string) => {
    if (!user || seen.has(user)) return;
    seen.add(user);
    const name = (fullname || user || '').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    out.push({
      user, mode, label: `${dept || '-'} · ${mode}`, me: user === me.value, fullname,
      short: parts.length > 2 ? `${parts[0]} ${parts[1]}` : name,
      initials: parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?',
      isAdmin, since: sinceOf(at),
    });
  };
  // Kunci = 1 akun per area (pemegang ambil kedua slot) → 1 chip per user.
  for (const sl of ['plan', 'actual'] as const) {
    const x = l?.[sl];
    if (x) build(x.user, x.fullname, !!x.is_admin, x.dept, 'Edit', x.opened_at);
  }
  if (!seen.size) build(me.value, authStore.user?.fullname ?? null, iAmAdmin.value, iAmAdmin.value ? 'Administrator' : null, 'Edit', currentUser.value.lock?.opened_at);
  for (const v of storeAch.viewers[selectedArea.value] ?? []) build(v.user, v.fullname, v.is_admin, v.dept, 'View', v.since);
  return out.sort((a, b) => Number(b.me) - Number(a.me));
});

// Jumlah kolom setelah 7 kolom awal (utk colspan baris proses antara) — diukur dari baris part
// karena kolom actual bergantung hak akses. Fallback 34 = susunan default.
const restCols = ref(34);
const measureCols = () => {
  const tr = tableRef.value?.querySelector('tbody tr.op-main');
  if (tr) restCols.value = Math.max(1, tr.children.length - 7);
};

const dataTable = ref<Detail[]>([]);
const note = ref<string>('-');
const summaryData = ref<SummaryData>();
const attendance = ref<Attendance[]>([]);

const dataPreparation = () => {
  dataTable.value = [];
  attendance.value = [];
  summaryData.value = undefined;

  cleanData.value.forEach((group) => {
    if (group.prefix_area !== selectedPrefixArea.value) return;
    group.detail.forEach((item) => {
      if (item.line_id === selectedArea.value) {
        currentPatan.value = item.patan ?? '';
        note.value = item.note ?? '-';
        summaryData.value = item.summary_data;
        attendance.value = item.attendance;
        // Simpan baseline lotsize untuk deteksi perubahan saat edit plan
        dataTable.value = item.detail.map((d: any) => ({ ...d, _lotsizeOrig: d.lotsize }));
        lotsizeEdits.value.clear();
      }
    });
  });

  if (attendance.value.length === 0) {
    attendance.value = ['Foreman', 'Checkman', 'Handling', 'Operator'].map((role) => ({
      DATE: filter.value.date,
      line_id: selectedArea.value,
      shift: filter.value.shift,
      name_role: role,
      standard: 0,
      present: 0,
      sick: 0,
      leave: 0
    }));
  }

  formEdit.value = {
    detail: dataTable.value,
    attendance: attendance.value
  };
  currentPage.value = 1;
  formEdit.value.detail.forEach((d: any) => { if (d.master_dirty === undefined) d.master_dirty = '0'; });
  originalSnapshot.value = serializeForm();   // patokan dirty-tracking
};

const currentPage = ref(1);
const pageSize = ref(14);
const showSummary = ref(false);

// Dirty tracking — tombol "Simpan Perubahan" aktif HANYA bila ada perubahan.
const originalSnapshot = ref('');
const serializeForm = () => JSON.stringify({ d: formEdit.value.detail, a: formEdit.value.attendance });
const isDirty = computed(() => serializeForm() !== originalSnapshot.value);

// ── Undo (Ctrl+Z) — snapshot diambil tiap mulai fokus sel; pop = kembalikan nilai sebelumnya ──
const undoStack = ref<string[]>([]);
const snapForUndo = () => {
  const s = serializeForm();
  if (undoStack.value[undoStack.value.length - 1] !== s) {
    undoStack.value.push(s);
    if (undoStack.value.length > 60) undoStack.value.shift();
  }
};
const canUndo = computed(() => undoStack.value.length > 0);
const undo = () => {
  if (!undoStack.value.length) return;
  const obj = JSON.parse(undoStack.value.pop() as string);
  formEdit.value.detail = obj.d;
  formEdit.value.attendance = obj.a;
};
const searchQuery = ref('');

const filteredData = computed(() => {
  if (!searchQuery.value) return formEdit.value.detail;
  const q = searchQuery.value.toLowerCase();
  return formEdit.value.detail.filter((item) => item.part_number?.toLowerCase().includes(q) || item.job_number?.toLowerCase().includes(q));
});

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredData.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredData.value.length / pageSize.value));
});


// ── Tambah baris planning (situasi tertentu) ────────────────────
// Baris baru = urut_plan '0' → kolom Part jadi dropdown (auto-lookup per area),
// dan field plan (lotsize/tpt/uph) editable. stroke/uph/machine ikut master saat refresh.
const isNewRow = (item: Detail) => item.urut_plan === '0';
// selectedArea = kode area master → cocokkan dengan semua zone-nya (ROBOT BARAT, ...).
const { zonesOf } = useWeldingAreas();
const areaZones = computed(() => zonesOf(selectedArea.value).map((z) => z.toUpperCase()));
const partsForArea = computed(() => {
  const zs = areaZones.value;
  const f = partData.value.filter((p) => { const l = (p.line || '').toUpperCase(); return zs.some((z) => l.includes(z)); });
  return f.length ? f : partData.value;   // fallback: tampilkan semua bila tak ada yg cocok
});
const onSelectPart = (item: Detail, p: any) => {
  if (p && typeof p === 'object') {
    item.part_number = p.part_number ?? '';
    item.job_number = p.job_number ?? '';
  }
};
// Tandai baris yang field master (UPH/Machine/Stroke)-nya diubah → write-back ke ms_welding.
const markMaster = (item: Detail) => { (item as any).master_dirty = '1'; };

// Hitung actual turunan LIVE per baris (preview): stroke_act, uph, tpt.
//   stroke_act = total(OK+repair+reject) × stroke master.
//   finish = finish_actual tersimpan, atau WAKTU SEKARANG (preview) bila belum disimpan.
//   start   = finish part sebelumnya di area sama, atau awal shift (day 07:15 / night 20:00).
//   worked  = (finish−start) − downtime(menit) ; uph = total/worked_jam ; tpt = total/uph.
// Saat SIMPAN, store memfinalkan finish = waktu simpan (lihat editData).
const rowTotalAct = (it: any) => (Number(it.lotsize_actual) || 0) + (Number(it.repair) || 0) + (Number(it.reject) || 0);
// Hitung stroke/UPH/TPT aktual per baris — langsung reaktif ke v-model, tanpa Map.
// Antrian mesin (prev) pakai finish_actual yang sudah tersimpan; baris yg sedang
// diedit (finish_actual=null) memakai Date.now() tapi TIDAK menggeser antrian.
function _calcRow(it: any, prevFinish: Record<string, number>): { stroke: number; uph: number; tpt: number } | null {
  const total = rowTotalAct(it);
  if (total <= 0) return null;
  const shiftStart = String(filter.value.shift) === '2' ? '20:00:00' : '07:15:00';
  const dateStr    = filter.value.date || new Date().toISOString().slice(0, 10);
  const baseMs     = Date.parse(`${dateStr}T${shiftStart}`);
  const mkey       = (it.mc_weld || '') as string;
  const startMs    = prevFinish[mkey] ?? baseMs;
  const hasFinish  = !!it.finish_actual;
  const finishMs   = hasFinish ? Date.parse(String(it.finish_actual).replace(' ', 'T')) : Date.now();
  const dt    = (Number(it.dt_machines) || 0) + (Number(it.dt_jig) || 0)
              + (Number(it.dt_other)    || 0) + (Number(it.dt_wip)  || 0);
  const wMin  = Math.max(0, (finishMs - startMs) / 60000 - dt);
  const wH    = wMin / 60;
  const uph   = wH > 0 ? Math.round((total / wH) * 100) / 100 : 0;
  const tpt   = uph > 0 ? Math.round((total / uph) * 100) / 100 : 0;
  const stroke = total * (Number(it.stroke_plan) || 0);
  if (hasFinish) prevFinish[mkey] = finishMs;           // geser antrian hanya untuk baris tersimpan
  return { stroke, uph, tpt };
}


// Satu computed yang menghitung UPH & TPT untuk SEMUA baris sekaligus.
// Hasilnya di-cache oleh Vue — tidak ada looping ulang per cell saat render.
const actCalcMap = computed<Map<string, { uph: number; tpt: number; stroke: number }>>(() => {
  const out = new Map<string, { uph: number; tpt: number; stroke: number }>();
  const detail = formEdit.value.detail as any[];
  const shiftStart = String(filter.value.shift) === '2' ? '20:00:00' : '07:15:00';
  const dateStr    = filter.value.date || new Date().toISOString().slice(0, 10);
  const baseMs     = Date.parse(`${dateStr}T${shiftStart}`);
  const nowMs      = Date.now();
  const prev: Record<string, number> = {};   // finish terakhir per mesin (tersimpan saja)

  for (const r of detail) {
    const id    = String(r.schedule_id ?? r.id ?? '');
    const total = rowTotalAct(r);
    const stroke = total * (Number(r.stroke_plan) || 0);
    if (total <= 0) { out.set(id, { uph: 0, tpt: 0, stroke: 0 }); continue; }
    const mkey      = (r.mc_weld || '') as string;
    const startMs   = prev[mkey] ?? baseMs;
    const hasFinish = !!r.finish_actual;
    const finishMs  = hasFinish ? Date.parse(String(r.finish_actual).replace(' ', 'T')) : nowMs;
    const dt  = (Number(r.dt_machines) || 0) + (Number(r.dt_jig) || 0)
              + (Number(r.dt_other)    || 0) + (Number(r.dt_wip)  || 0);
    const wMin = Math.max(0, (finishMs - startMs) / 60000 - dt);
    const wH   = wMin / 60;
    const uph  = wH > 0 ? Math.round((total / wH) * 100) / 100 : 0;
    const tpt  = uph > 0 ? Math.round((total / uph) * 100) / 100 : 0;
    out.set(id, { uph, tpt, stroke });
    if (hasFinish) prev[mkey] = finishMs;   // geser antrian hanya baris tersimpan
  }
  return out;
});

const _actKey   = (it: any) => String(it.schedule_id ?? it.id ?? '');
const strokeActLive = (it: any) => actCalcMap.value.get(_actKey(it))?.stroke ?? '';
const uphLive = (it: any) => {
  const c = actCalcMap.value.get(_actKey(it));
  if (!c || rowTotalAct(it) <= 0) return it.uph_act || it.uph || '-';
  return c.uph > 0 ? c.uph : (it.uph_act || it.uph || '-');
};
const tptLive = (it: any) => {
  const c = actCalcMap.value.get(_actKey(it));
  if (!c || rowTotalAct(it) <= 0) return it.tpt_actual || '-';
  return c.tpt > 0 ? c.tpt : (it.tpt_actual || '-');
};

const baseBlankDetail = () => ({
  id: '', schedule_id: '', area: selectedArea.value, date: filter.value.date,
  shift: filter.value.shift, part_number: '', patan: currentPatan.value,
  job_number: '', op: null, mc_weld: null, status_plan: 'FP',
  stroke_plan: null, lotsize: null, uph_plan: null, tpt: null, urut_plan: '0',
  lotsize_actual: null, stroke_act: null, uph: null, tpt_actual: null,
  finish_actual: null, repair: null, reject: null, idletime: null,
  dt_machines: null, dt_jig: null, dt_other: null, dt_wip: null, total_dt: 0,
  ket_repair: null, ket_reject: null, ket_dt_machines: null, ket_dt_jig: null,
  ket_dt_other: null, ket_dt_wip: null, keterangan_plan: null, keterangan_actual: null,
  additional: null, override_reason: null, status: null, master_dirty: '0',
  is_open: '0', is_running: '0', is_next: '0',
} as unknown as Detail);

// ── Add Row: modal smart-form (multi-baris) — part diambil dari MUTASI
//    (mutasi_weld FP + mutasi_wip WIP) area/bulan yg sama, lengkap dgn angka
//    stok/plan/DN/MDFO supaya planner tahu kondisi part sebelum diproduksi. ──
interface AddRow {
  area: string;                 // zone (welding_achievement_v2.area) — dari kandidat mutasi / lookup master
  part_number: string; job_number: string; op: string; status_plan: string;
  mc_weld: string; stroke_plan: number | string; uph_plan: number | string;
  lotsize: number | string; plan_lkh: number; loading: boolean;
  info: PartCandidate | null;   // angka mutasi (null bila part diketik manual)
}
const blankAddRow = (): AddRow => ({
  area: areaZones.value.length === 1 ? zonesOf(selectedArea.value)[0] : '',
  part_number: '', job_number: '', op: '', status_plan: 'FP',
  mc_weld: '', stroke_plan: '', uph_plan: '', lotsize: '', plan_lkh: 0, loading: false, info: null,
});
const showAddModal = ref(false);
const addRows = ref<AddRow[]>([]);
const showPartPicker  = ref(false);
const partCandidates  = ref<PartCandidate[]>([]);
const candLoading     = ref(false);
const candKey         = ref('');   // cache per (area|date|shift)
const loadCandidates = async (force = false) => {
  const key = `${selectedArea.value}|${filter.value.date}|${filter.value.shift}`;
  if (!force && candKey.value === key && partCandidates.value.length) return;
  candLoading.value = true;
  try {
    const res = await listPartCandidates(selectedArea.value, filter.value.date, filter.value.shift);
    partCandidates.value = (res?.data?.data as PartCandidate[]) || [];
    candKey.value = key;
  } catch (e) { partCandidates.value = []; } finally { candLoading.value = false; }
};
const openAddModal = () => { addRows.value = []; showAddModal.value = true; loadCandidates(); };
const openPartPicker = () => { showPartPicker.value = true; loadCandidates(); };
const addAnother = () => addRows.value.push(blankAddRow());
const removeAddRow = (i: number) => { addRows.value.splice(i, 1); };
const addRowKeys = computed(() => addRows.value.filter((r) => r.part_number).map((r) => `${r.status_plan}|${r.part_number}`));
// Terapkan pilihan dari picker: baris yg sudah ada dipertahankan, part baru ditambah,
// part yg di-uncheck di picker dihapus (kecuali baris manual tanpa info).
const applyPicked = (picked: PartCandidate[]) => {
  const pickedKeys = new Set(picked.map((c) => `${c.status_plan}|${c.part_number}`));
  addRows.value = addRows.value.filter((r) => !r.info || pickedKeys.has(`${r.status_plan}|${r.part_number}`));
  const have = new Set(addRowKeys.value);
  for (const c of picked) {
    const k = `${c.status_plan}|${c.part_number}`;
    if (have.has(k)) continue;
    const defLot = c.plan_shift > 0 ? c.plan_shift : (c.plan_lkh > 0 ? c.plan_lkh : '');
    addRows.value.push({
      area: c.area || '',
      part_number: c.part_number, job_number: c.job_number, op: c.op || '', status_plan: c.status_plan,
      mc_weld: c.machine || '', stroke_plan: c.stroke || '', uph_plan: c.uph || '',
      lotsize: defLot, plan_lkh: c.plan_lkh || 0, loading: false, info: c,
    });
  }
  showPartPicker.value = false;
};
// Baris manual (ketik sendiri via CustomSelectSearch) — tetap lookup master seperti dulu.
const onAddSelectPart = async (row: AddRow, p: any) => {
  if (!p || typeof p !== 'object') return;
  row.part_number = p.part_number ?? '';
  row.job_number = p.job_number ?? '';
  row.info = partCandidates.value.find((c) => c.part_number === row.part_number) || null;
  row.loading = true;
  try {
    const res = await lookupPartMaster(row.part_number, selectedArea.value, filter.value.date, filter.value.shift);
    const d = (res?.data?.data) || {};
    row.mc_weld = d.machine ?? '';
    row.stroke_plan = d.stroke ?? '';
    row.uph_plan = d.uph ?? '';
    row.op = d.op ?? '';
    row.status_plan = d.status_plan ?? 'FP';
    if (d.area) row.area = d.area;
    row.plan_lkh = Number(d.plan_lkh ?? 0);
    if (row.lotsize === '' || row.lotsize === 0) row.lotsize = row.info?.plan_shift || row.plan_lkh || '';
  } catch (e) { /* abaikan */ } finally { row.loading = false; }
};
const fmtN = (n: number | null | undefined) => (n == null || n === 0 ? '-' : Number(n).toLocaleString('id-ID'));
// Proyeksi stok setelah shift bila lot size ini diproduksi: stok sebelum + lot − DN shift.
const stockAfter = (r: AddRow) => {
  if (!r.info) return null;
  const lot = Number(r.lotsize) || 0;
  return r.info.stock_before + lot - r.info.dn_shift;
};
const confirmAddRows = async () => {
  const valid = addRows.value.filter((r) => r.part_number);
  if (!valid.length) { showAddModal.value = false; return; }
  for (const r of valid) {
    const d: any = baseBlankDetail();
    // zone baris: dari kandidat/lookup; fallback zone pertama area master
    d.area = r.area || zonesOf(selectedArea.value)[0] || selectedArea.value;
    d.part_number = r.part_number; d.job_number = r.job_number; d.op = r.op || null;
    d.status_plan = r.status_plan || 'FP'; d.mc_weld = r.mc_weld || null;
    d.stroke_plan = r.stroke_plan === '' ? null : r.stroke_plan;
    d.uph_plan = r.uph_plan === '' ? null : r.uph_plan;
    d.lotsize = r.lotsize === '' ? null : r.lotsize;
    formEdit.value.detail.push(d);
  }
  showAddModal.value = false;
  currentPage.value = totalPages.value;
  await nextTick();
};

watch(searchQuery, () => {
  currentPage.value = 1;
});

const getGlobalIndex = (localIndex: number) => {
  const item = paginatedData.value[localIndex];
  return formEdit.value.detail.findIndex((d) => d === item);
};

watch(isModalEditOpen, (newVal) => {
  if (newVal) {
    dataPreparation();
    currentPage.value = 1;
    focusFirstActual();
    recomputePageSize();
    syncHeaderOffsets();
  }
});

onMounted(() => {
  if (isModalEditOpen.value) {
    dataPreparation();
  }
});

// Pembagian hak: kolom PLAN (machine/stroke/lotsize/UPH/ket plan/Add Row) hanya
// PCD; kolom ACTUAL hanya dept Welding (punya Create/Update, bukan PCD). Admin bebas.
const isAdmin = () => authStore.user.username === 'administrator' || authStore.group === '1';
const canEditPlan = () => storeAch.permissions.pcd || isAdmin();
// Akses halaman sudah disaring router (parent Transaction.View.AchievementWeldingV2).
// User welding umumnya hanya punya parent itu tanpa child Create/Update →
// jangan syaratkan child; cukup BUKAN PCD.
const canEditActual = () => isAdmin() || !storeAch.permissions.pcd;
const canEditKeteranganPlan = () => canEditPlan();

const saving = ref(false);
const saveData = async () => {
  if (!isDirty.value || saving.value) return;     // tak ada perubahan / sedang simpan
  const masterChanged = formEdit.value.detail.some((d: any) => d.master_dirty === '1');
  if (masterChanged && !window.confirm(
    'Perubahan UPH / Machine / Stroke akan MEMPERBARUI Master Data (ms_welding) dan berlaku ' +
    'untuk semua pemakaian part ini. Lanjut simpan?'
  )) return;
  saving.value = true;
  try {
    const ok = await storeAch.editData();           // toast sukses ditangani store; modal TETAP terbuka
    if (ok) {
      formEdit.value.detail.forEach((d: any) => { d.master_dirty = '0'; });
      originalSnapshot.value = serializeForm();      // reset dirty → tombol nonaktif lagi
    }
  } finally {
    saving.value = false;
  }
};

const updateIsRunning = async (i: number) => {
  const d = formEdit.value.detail[i];
  d.is_running = '1';
  await storeAch.startRunningItem(d.schedule_id);
};
const resetIsRunning = async (i: number) => {
  const d = formEdit.value.detail[i];
  d.is_running = '0';
  await storeAch.stopRunningItem(d.schedule_id);
};
const updateIsNext = async (i: number) => {
  const d = formEdit.value.detail[i];
  d.is_next = '1';
  await storeAch.startProcessItem(d.schedule_id);
};
const resetIsNext = async (i: number) => {
  const d = formEdit.value.detail[i];
  d.is_next = '0';
  await storeAch.stopProcessItem(d.schedule_id);
};

const isDone = (i: number) => {
  const d = formEdit.value.detail[i];
  return (parseInt(d.lotsize_actual ?? '0') > 1 && d.is_next === '0') || parseInt(d.repair ?? '0') > 1 || parseInt(d.reject ?? '0') > 1;
};

const closeModal = async () => {
  if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch (e) { /* ignore */ } }
  await storeAch.closeFormEditById(selectedArea.value);
  storeAch.isModalEditOpen = false;
};

// ── Edit Lotsize Plan (existing rows) ──────────────────────────────
// Map<globalIndex, { original, saving, error }>
const lotsizeEdits = ref<Map<number, { original: any; saving: boolean; saved: boolean; error: string | null }>>(new Map());

function onLotsizeInput(item: any, globalIdx: number) {
  if (!lotsizeEdits.value.has(globalIdx)) {
    lotsizeEdits.value.set(globalIdx, { original: item._lotsizeOrig ?? item.lotsize, saving: false, saved: false, error: null });
  }
  const e = lotsizeEdits.value.get(globalIdx)!;
  e.saved = false;
  e.error = null;
}

async function handleLotsizeSave(item: any, globalIdx: number) {
  const origLotsize = lotsizeEdits.value.get(globalIdx)?.original ?? item._lotsizeOrig;
  if (String(item.lotsize) === String(origLotsize)) return; // tidak berubah

  const state = lotsizeEdits.value.get(globalIdx) ?? { original: origLotsize, saving: false, saved: false, error: null };
  state.saving = true;
  state.error = null;
  lotsizeEdits.value.set(globalIdx, state);

  try {
    const res = await updatePlanLotsize({
      id:          item.id   || null,
      schedule_id: item.schedule_id || null,
      part_number: item.part_number,
      date:        filter.value.date,
      shift:       Number(filter.value.shift),
      area:        (item as any).area || selectedArea.value, // zone baris (area master bisa gabungan)
      lotsize:     item.lotsize === '' || item.lotsize === null ? null : Number(item.lotsize),
    });
    if (res.data?.success) {
      state.saved = true;
      state.original = item.lotsize; // update baseline
      item._lotsizeOrig = item.lotsize;
    } else {
      state.error = res.data?.messages ?? 'Gagal menyimpan';
      item.lotsize = origLotsize; // rollback
    }
  } catch (e: any) {
    state.error = e?.response?.data?.messages ?? 'Error jaringan';
    item.lotsize = origLotsize;
  } finally {
    state.saving = false;
    lotsizeEdits.value.set(globalIdx, { ...state });
  }
}

// ── Fullscreen ──────────────────────────────────────────────────
const panelRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);
const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) await panelRef.value?.requestFullscreen?.();
    else await document.exitFullscreen?.();
  } catch (e) { /* ignore */ }
};
// Pas-kan jumlah baris agar TIDAK ada scroll vertikal (modal & fullscreen), ukur tinggi nyata.
const recomputePageSize = async () => {
  if (!isFullscreen.value) {
    pageSize.value = 14;
    if (currentPage.value > totalPages.value) currentPage.value = totalPages.value;
    return;
  }
  await nextTick();
  const scrollBody = scrollBodyRef.value;
  const wrap       = tableRef.value;
  if (!scrollBody || !wrap) return;

  pageSize.value = 19;
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value;
};
const onFsChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
  recomputePageSize();
  syncHeaderOffsets();
};
const onWinResize = () => { recomputePageSize(); syncHeaderOffsets(); };

// Header 3 baris sticky: offset `top` diukur dari tinggi baris NYATA (bukan angka tetap
// 25/55/80px) — baris ber-<br> lebih tinggi → garis outline header meleset/tumpang tindih.
const syncHeaderOffsets = async () => {
  await nextTick();
  const rows = tableRef.value?.querySelectorAll<HTMLTableRowElement>('thead tr');
  if (!rows?.length) return;
  let top = 0;
  rows.forEach((tr) => {
    tr.querySelectorAll<HTMLElement>('th').forEach((th) => { th.style.top = `${top}px`; });
    top += tr.getBoundingClientRect().height;
  });
};

// ── Navigasi keyboard ala Excel (anti-lag: murni DOM, tanpa state berat) ──
const tableRef      = ref<HTMLElement | null>(null);
watch([() => paginatedData.value, splitOp], () => nextTick(measureCols), { immediate: true });
const scrollBodyRef = ref<HTMLElement | null>(null);
const bottomCtrlRef = ref<HTMLElement | null>(null);

// Matriks sel yang bisa difokus (input/select aktif & terlihat), per baris <tr>.
const rowCells = (): HTMLElement[][] => {
  if (!tableRef.value) return [];
  const trs = Array.from(tableRef.value.querySelectorAll('tbody tr')) as HTMLElement[];
  return trs
    .map((tr) =>
      (Array.from(tr.querySelectorAll('input, select')) as HTMLElement[]).filter(
        (el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null
      )
    )
    .filter((cells) => cells.length > 0); // abaikan baris pemisah mesin (tanpa input)
};
const locate = (el: HTMLElement) => {
  const grid = rowCells();
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r].indexOf(el);
    if (c !== -1) return { grid, r, c };
  }
  return { grid, r: -1, c: -1 };
};
const focusCell = (el?: HTMLElement) => {
  if (!el) return;
  el.focus();
  if (el.tagName === 'INPUT') (el as HTMLInputElement).select?.();
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
};
const focusByCol = (r: number, c: number): boolean => {
  const grid = rowCells();
  if (r < 0 || r >= grid.length || !grid[r].length) return false;
  focusCell(grid[r][Math.min(c, grid[r].length - 1)]);
  return true;
};
const goPage = async (dir: 1 | -1, col = 0): Promise<boolean> => {
  const target = currentPage.value + dir;
  if (target < 1 || target > totalPages.value) return false;
  currentPage.value = target;
  await nextTick();
  const grid = rowCells();
  focusByCol(dir === 1 ? 0 : grid.length - 1, col);
  return true;
};
const moveV = async (dir: 1 | -1, el: HTMLElement) => {
  const { r, c } = locate(el);
  if (r === -1) return;
  if (!focusByCol(r + dir, c)) await goPage(dir, c);
};
const moveH = async (dir: 1 | -1, el: HTMLElement) => {
  const { grid, r, c } = locate(el);
  if (r === -1) return;
  const nc = c + dir;
  if (nc >= 0 && nc < grid[r].length) { focusCell(grid[r][nc]); return; }
  if (dir === 1) { if (!focusByCol(r + 1, 0)) await goPage(1, 0); }
  else {
    if (r - 1 >= 0) focusCell(grid[r - 1][grid[r - 1].length - 1]);
    else await goPage(-1, 9999);
  }
};
const atStart = (el: HTMLInputElement) => (el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0;
const atEnd = (el: HTMLInputElement) => el.selectionStart === el.value.length && el.selectionEnd === el.value.length;

const onGridKeydown = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement;
  if (!el || !/^(INPUT|SELECT)$/.test(el.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); return; }
  const isInput = el.tagName === 'INPUT';
  const isText = isInput && (el as HTMLInputElement).type === 'text';
  switch (e.key) {
    case 'Enter':
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); saveData(); break; }
      e.preventDefault(); moveV(e.shiftKey ? -1 : 1, el); break;
    case 'ArrowDown': if (!isInput) return; e.preventDefault(); moveV(1, el); break;
    case 'ArrowUp': if (!isInput) return; e.preventDefault(); moveV(-1, el); break;
    case 'ArrowRight': if (isText && !atEnd(el as HTMLInputElement)) return; e.preventDefault(); moveH(1, el); break;
    case 'ArrowLeft': if (isText && !atStart(el as HTMLInputElement)) return; e.preventDefault(); moveH(-1, el); break;
    case 'Tab': e.preventDefault(); moveH(e.shiftKey ? -1 : 1, el); break;
  }
};

// Shortcut tingkat modal (simpan/tutup/ganti halaman). Dipasang di root panel.
const onModalKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') { if (!document.fullscreenElement) closeModal(); return; }
  if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) { e.preventDefault(); saveData(); return; }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); return; }
  if ((e.altKey && e.key === 'ArrowRight') || e.key === 'PageDown') { e.preventDefault(); goPage(1); return; }
  if ((e.altKey && e.key === 'ArrowLeft') || e.key === 'PageUp') { e.preventDefault(); goPage(-1); return; }
};

// Auto-select isi number saat fokus (klik) → langsung ketik timpa.
const onFocusIn = (e: FocusEvent) => {
  const el = e.target as HTMLInputElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT')) snapForUndo();  // titik undo per sel
  if (el && el.tagName === 'INPUT' && el.type === 'number') el.select?.();
};

// Saat modal dibuka: fokuskan kolom OK (lotsize_actual) baris pertama agar foreman langsung input.
const focusFirstActual = async () => {
  await nextTick();
  const first = tableRef.value?.querySelector('input[data-c="lotsize_actual"]') as HTMLElement | null;
  const grid = rowCells();
  focusCell(first || (grid[0] && grid[0][0]));
};

onMounted(() => {
  document.addEventListener('fullscreenchange', onFsChange);
  window.addEventListener('resize', onWinResize);
  window.addEventListener('beforeunload', onBeforeUnload);
  socket.on('refreshAcievementWelding', onLockChanged);
});
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFsChange);
  window.removeEventListener('resize', onWinResize);
  window.removeEventListener('beforeunload', onBeforeUnload);
  socket.off('refreshAcievementWelding', onLockChanged);
  stopHeartbeat();
  if (tickTimer) clearInterval(tickTimer);
  // Navigasi keluar halaman saat modal masih terbuka → lepas lock
  if (isModalEditOpen.value) storeAch.closeFormEditById(selectedArea.value);
});

// Heartbeat + jam hidup hanya saat modal terbuka
watch(isModalEditOpen, (open) => {
  if (open) {
    lockLostBanner.value = null;
    startHeartbeat();
    nowTick.value = Date.now();
    tickTimer = setInterval(() => { nowTick.value = Date.now(); }, 30000);
  } else {
    stopHeartbeat();
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }
}, { immediate: true });
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isModalEditOpen"
        class="fixed inset-0 z-[3000] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div
          id="ach-edit-panel"
          ref="panelRef"
          tabindex="-1"
          @keydown="onModalKeydown"
          class="fs-panel bg-white rounded-lg shadow-lg w-[98%] max-w-[1900px] h-[95vh] max-h-[95vh] flex flex-col outline-none"
        >
          <!-- Header Modal -->
          <div class="flex items-center justify-between gap-3 py-3 px-4 border-b">
            <div class="flex items-center gap-3 min-w-0 flex-wrap">
              <h1 class="text-gray-800 text-base sm:text-lg font-semibold truncate">
                Achievement Welding - Area {{ selectedArea }}
              </h1>
              <OpSplitToggle />
              <!-- Presence chips: editor (1 akun) + viewer (banyak) area ini -->
              <div class="flex items-center gap-1.5 flex-wrap">
                <span
                  v-for="c in presenceChips"
                  :key="c.user"
                  class="inline-flex items-center gap-1.5 text-[11px] leading-none pl-1 pr-2 py-1 rounded-full border whitespace-nowrap"
                  :class="c.me ? 'bg-blue-50 text-blue-700 border-blue-200' : c.mode === 'Edit' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200'"
                  :title="`${c.me ? 'Anda' : (c.fullname || c.user)} — ${c.label}${c.since ? ' · sejak ' + c.since : ''}`"
                >
                  <span
                    class="relative w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold text-white"
                    :class="c.me ? 'bg-blue-600' : c.mode === 'Edit' ? 'bg-amber-500' : 'bg-gray-400'"
                  >
                    {{ c.initials }}
                    <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white lock-dot"></span>
                  </span>
                  <span class="font-semibold">{{ c.me ? 'Anda' : c.short }}</span>
                  <i v-if="c.isAdmin" class="mdi mdi-shield-crown text-amber-500" title="Administrator"></i>
                  <span class="opacity-70">{{ c.label.split(' · ')[0] }} · <i :class="c.mode === 'Edit' ? 'mdi mdi-pencil' : 'mdi mdi-eye'"></i> {{ c.mode }}<template v-if="c.since"> · {{ c.since }}</template></span>
                </span>
              </div>
              <i
                class="hidden xl:inline mdi mdi-keyboard-outline text-gray-300 hover:text-gray-500 text-base cursor-help"
                title="Enter / ↑↓ pindah baris · Tab / ←→ pindah kolom · PageUp/Down ganti halaman · Alt+O OP gabung/pisah · Ctrl+S simpan · Esc tutup"
              ></i>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <button
                @click="toggleFullscreen"
                class="text-gray-400 hover:text-blue-600"
                :title="isFullscreen ? 'Keluar layar penuh (F11/Esc)' : 'Layar penuh'"
              >
                <i :class="isFullscreen ? 'mdi mdi-fullscreen-exit' : 'mdi mdi-fullscreen'" class="text-2xl"></i>
              </button>
              <button @click="closeModal" class="text-gray-400 hover:text-gray-600" title="Tutup (Esc)">
                <i class="mdi mdi-close text-2xl"></i>
              </button>
            </div>
          </div>

          <!-- Body Modal -->
          <div ref="scrollBodyRef" class="px-4 pt-2 pb-3 overflow-y-auto flex flex-col gap-2 scroll-stable">

            <div class="shadow-md rounded-lg p-2 bg-white border border-gray-200">
              <div ref="tableRef" class="relative overflow-x-auto pb-2 table-wrapper" @keydown="onGridKeydown" @focusin="onFocusIn">
                <table class="ach-tbl w-full text-xs text-left text-gray-900 whitespace-nowrap">
                  <thead class="text-xs text-gray-700">
                    <tr>
                      <th colspan="12" class="px-2 py-1.5 text-center bg-blue-200">Plan</th>
                      <th colspan="22" class="px-2 py-1.5 text-center bg-green-200">Actual</th>
                    </tr>
                    <tr>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-blue-200">No</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-blue-200">Part Number</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-blue-200">Job Number</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-blue-200">Status</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-blue-200">Machine</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-blue-200 leading-tight">Total<br />Proses</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-blue-200">Stroke</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-blue-200 leading-tight">Qty/<br />Kbn</th>
                      <th rowspan="2" class="px-2 py-1.5 text-center bg-blue-200">Lot Size</th>
                      <th rowspan="2" class="px-2 py-1.5 text-center bg-blue-200">TPT</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-blue-200">UPH Plan</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-blue-200">Keterangan</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-green-200">Stroke</th>
                      <th rowspan="2" class="px-2 py-1.5 text-center bg-green-200">OK</th>
                      <th rowspan="2" colspan="2" class="px-2 py-1.5 text-center bg-green-200">Repair</th>
                      <th rowspan="2" colspan="2" class="px-2 py-1.5 text-center bg-green-200">Reject</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-green-200 leading-tight">Total<br />Lot Size</th>
                      <th rowspan="2" class="px-2 py-1.5 text-center bg-green-200">Idletime</th>
                      <th colspan="9" class="px-2 py-1.5 text-center bg-green-200">Down Time</th>
                      <th rowspan="2" class="px-2 py-1.5 text-center bg-green-200">TPT</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-green-200">UPH</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-green-200">Keterangan</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-green-200">Start Machine</th>
                      <th rowspan="3" class="px-2 py-1.5 text-center bg-green-200">Next Process</th>
                    </tr>
                    <tr>
                      <th colspan="2" class="px-2 py-1.5 text-center bg-green-200">Machines</th>
                      <th colspan="2" class="px-2 py-1.5 text-center bg-green-200">Jig</th>
                      <th colspan="2" class="px-2 py-1.5 text-center bg-green-200">Other</th>
                      <th colspan="2" class="px-2 py-1.5 text-center bg-green-200">Bahan</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">Total</th>
                    </tr>
                    <tr>
                      <th class="px-2 py-1.5 text-center bg-blue-200">pcs</th>
                      <th class="px-2 py-1.5 text-center bg-blue-200">min</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">pcs</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">pcs</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">Ket</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">pcs</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">Ket</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">min</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">min</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">Ket</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">min</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">Ket</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">min</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">Ket</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">min</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">Ket</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">min</th>
                      <th class="px-2 py-1.5 text-center bg-green-200">min</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="(item, localIndex) in paginatedData" :key="item.schedule_id || localIndex">
                    <!-- Mode OP Pisah: proses antara read-only (tanpa input → dilewati navigasi keyboard);
                         baris part di bawahnya = OP terakhir, tempat actual diisi. -->
                    <template v-if="splitOp">
                      <tr v-for="o in midOps(item)" :key="o.op" class="op-sub text-center">
                        <td class="px-2 py-1"></td>
                        <td class="px-2 py-1">{{ item.part_number }}</td>
                        <td class="px-2 py-1">{{ item.job_number }}</td>
                        <td class="px-2 py-1">WIP</td>
                        <td class="px-2 py-1 font-medium">{{ o.machine }}</td>
                        <td class="px-2 py-1"><span class="op-badge">{{ o.op }}</span></td>
                        <td class="px-2 py-1">{{ o.stroke || '-' }}</td>
                        <td :colspan="restCols" class="px-3 py-1 text-left op-sub-note">
                          ↳ proses antara{{ o.ct ? ` · CT ${o.ct} dtk` : '' }} — actual diisi di {{ lastOp(item)?.op }}
                        </td>
                      </tr>
                    </template>
                    <tr class="bg-white hover:bg-gray-50 text-center border-b op-main">
                      <td class="px-2 py-1.5">{{ getGlobalIndex(localIndex) + 1 }}</td>
                      <!-- <td v-if="canEditAdditional(getGlobalIndex(localIndex))" class="px-2 py-1.5">
                        <CustomSelectSearch
                          v-model="item.part_number"
                          :items="partData"
                          label=""
                          :require-type="false"
                          return-type="part_number"
                        />
                      </td> -->
                      <td class="px-2 py-1.5">
                        <CustomSelectSearch
                          v-if="isNewRow(item)"
                          v-model="item.part_number"
                          :items="partsForArea"
                          label="Pilih Part"
                          :require-type="false"
                          return-type="part_number"
                          @select="onSelectPart(item, $event)"
                        />
                        <template v-else>{{ item.part_number }}</template>
                      </td>
                      <td class="px-2 py-1.5 font-bold">{{ item.job_number }}</td>
                      <!-- <td v-if="canEditAdditional(getGlobalIndex(localIndex))" class="px-2 py-1.5">
                        <select
                          v-model="item.status_plan"
                          class="block w-20 p-2 border text-sm text-gray-900 border-gray-300 rounded-lg bg-gray-50"
                        >
                          <option value="FP">FP</option>
                          <option value="WIP">WIP</option>
                        </select>
                      </td> -->
                      <td class="px-2 py-1.5">{{ item.status_plan }}</td>
                      <td class="px-2 py-1.5">
                        <input
                          v-if="canEditPlan()"
                          type="text"
                          v-model="item.mc_weld"
                          @input="markMaster(item)"
                          title="Machine — tersimpan ke master ms_welding"
                          class="zig-input w-20 px-1 py-1 border border-amber-300 rounded-lg bg-amber-50 text-xs"
                        />
                        <span v-else class="font-medium">{{ item.mc_weld || '-' }}</span>
                      </td>
                      <td class="px-2 py-1.5 text-center font-medium">
                        <span v-if="splitOp && lastOp(item)" class="op-badge" :title="`OP terakhir dari ${item.total_proses} proses`">{{ lastOp(item)!.op }}</span>
                        <template v-else>{{ item.total_proses || 1 }}</template>
                      </td>
                      <td class="px-2 py-1.5">
                        <input
                          v-if="canEditPlan()"
                          type="number"
                          v-model="item.stroke_plan"
                          @input="markMaster(item)"
                          title="Stroke — tersimpan ke master ms_welding"
                          class="block w-12 px-1 py-1 border border-amber-300 rounded-lg bg-amber-50 text-xs"
                        />
                        <span v-else>{{ item.stroke_plan }}</span>
                      </td>
                      <td class="px-2 py-1.5 text-center" :class="!item.qty_kbn || item.qty_kbn === '-' ? 'val-zero' : ''">{{ item.qty_kbn || '-' }}</td>
                      <!-- Lot Size plan: editable untuk semua baris. Existing → auto-lock Mutasi saat blur -->
                      <td class="px-1 py-1 relative" :title="isNewRow(item) ? '' : 'Edit lotsize → plan Mutasi akan dikunci (manual)'">
                        <div class="flex items-center gap-0.5">
                          <input
                            v-if="canEditPlan()"
                            type="number"
                            v-model="item.lotsize"
                            @input="!isNewRow(item) && onLotsizeInput(item, getGlobalIndex(localIndex))"
                            @blur="!isNewRow(item) && handleLotsizeSave(item, getGlobalIndex(localIndex))"
                            :class="[
                              'block w-16 px-1 py-1 text-xs font-bold rounded-lg border',
                              isNewRow(item)
                                ? 'border-gray-400 bg-gray-200'
                                : lotsizeEdits.get(getGlobalIndex(localIndex))?.error
                                  ? 'border-red-400 bg-red-50'
                                  : lotsizeEdits.get(getGlobalIndex(localIndex))?.saved
                                    ? 'border-emerald-400 bg-emerald-50'
                                    : String(item.lotsize) !== String((item as any)._lotsizeOrig)
                                      ? 'border-amber-400 bg-amber-50'
                                      : 'border-indigo-200 bg-indigo-50'
                            ]"
                          />
                          <span v-else class="font-bold text-xs px-1">{{ item.lotsize }}</span>
                          <!-- Indikator status save (hanya existing row) -->
                          <template v-if="!isNewRow(item)">
                            <span v-if="lotsizeEdits.get(getGlobalIndex(localIndex))?.saving" class="text-indigo-400 text-[10px]" title="Menyimpan...">
                              <svg class="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="30 70"/></svg>
                            </span>
                            <span v-else-if="lotsizeEdits.get(getGlobalIndex(localIndex))?.error" class="text-red-500 text-[9px]" :title="lotsizeEdits.get(getGlobalIndex(localIndex))?.error ?? undefined">⚠</span>
                          </template>
                        </div>
                      </td>
                      <!-- TPT read-only (turunan); UPH editable → master -->
                      <td class="px-2 py-1.5">{{ item.tpt }}</td>
                      <td class="px-2 py-1.5">
                        <input
                          v-if="canEditPlan()"
                          type="number"
                          v-model="item.uph_plan"
                          @input="markMaster(item)"
                          title="UPH — tersimpan ke master ms_welding"
                          class="block w-20 px-1 py-1 border border-amber-300 rounded-lg bg-amber-50 text-xs"
                        />
                        <span v-else>{{ item.uph_plan }}</span>
                      </td>
                      <td v-if="canEditKeteranganPlan()" class="px-2 py-1.5">
                        <select
                          v-model="item.keterangan_plan"
                          :title="item.keterangan_plan || '-'"
                          class="ket-select block w-40 pl-2 pr-6 text-xs"
                        >
                          <option value=""></option>
                          <option v-for="k in keteranganPlan" :key="k.id" :value="k.information">{{ k.information }}</option>
                        </select>
                      </td>
                      <td v-else class="px-2 py-1.5">{{ item.keterangan_plan }}</td>

                      <!-- ACTUAL -->
                      <td class="px-2 py-1.5" :class="!strokeActLive(item) ? 'val-zero' : ''">{{ strokeActLive(item) || '-' }}</td>
                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <input
                          type="number"
                          data-c="lotsize_actual"
                          v-model="item.lotsize_actual"
                          class="block w-20 px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs"
                        />
                      </td>
                      <td v-else class="px-2 py-1.5" :class="!Number(item.lotsize_actual) ? 'val-zero' : ''">{{ item.lotsize_actual }}</td>
                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <input
                          type="number"
                          v-model="item.repair"
                          class="block w-20 px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs"
                        />
                      </td>
                      <td v-else class="px-2 py-1.5" :class="!Number(item.repair) ? 'val-zero' : ''">{{ item.repair }}</td>
                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <input
                          type="text"
                          v-model="item.ket_repair"
                          :title="item.ket_repair || '-'"
                          class="block w-32 px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs text-ellipsis overflow-hidden whitespace-nowrap"
                        />
                      </td>
                      <td v-else class="px-2 py-1.5">{{ item.ket_repair }}</td>
                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <input
                          type="number"
                          v-model="item.reject"
                          class="block w-20 px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs"
                        />
                      </td>
                      <td v-else class="px-2 py-1.5" :class="!Number(item.reject) ? 'val-zero' : ''">{{ item.reject }}</td>
                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <input
                          type="text"
                          v-model="item.ket_reject"
                          :title="item.ket_reject || '-'"
                          class="block w-32 px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs text-ellipsis overflow-hidden whitespace-nowrap"
                        />
                      </td>
                      <td v-else class="px-2 py-1.5">{{ item.ket_reject }}</td>

                      <td
                        class="px-2 py-1.5"
                        :class="
                          rowTotalAct(item) > Number(item.lotsize)
                            ? 'text-blue-500 font-medium'
                            : rowTotalAct(item) > 0 && rowTotalAct(item) < Number(item.lotsize)
                              ? 'text-red-500 font-medium'
                              : ''
                        "
                      >
                        {{ rowTotalAct(item) || '' }}
                      </td>

                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <input
                          type="number"
                          v-model="item.idletime"
                          class="block w-20 px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs"
                        />
                      </td>
                      <td v-else class="px-2 py-1.5" :class="!Number(item.idletime) ? 'val-zero' : ''">{{ item.idletime }}</td>

                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <input
                          type="number"
                          v-model="item.dt_machines"
                          class="block w-20 px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs"
                        />
                      </td>
                      <td v-else class="px-2 py-1.5" :class="!Number(item.dt_machines) ? 'val-zero' : ''">{{ item.dt_machines }}</td>
                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <input
                          type="text"
                          v-model="item.ket_dt_machines"
                          :title="item.ket_dt_machines || '-'"
                          class="block w-32 px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs text-ellipsis overflow-hidden whitespace-nowrap"
                        />
                      </td>
                      <td v-else class="px-2 py-1.5">{{ item.ket_dt_machines }}</td>

                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <input
                          type="number"
                          v-model="item.dt_jig"
                          class="block w-20 px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs"
                        />
                      </td>
                      <td v-else class="px-2 py-1.5" :class="!Number(item.dt_jig) ? 'val-zero' : ''">{{ item.dt_jig }}</td>
                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <input
                          type="text"
                          v-model="item.ket_dt_jig"
                          :title="item.ket_dt_jig || '-'"
                          class="block w-32 px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs text-ellipsis overflow-hidden whitespace-nowrap"
                        />
                      </td>
                      <td v-else class="px-2 py-1.5">{{ item.ket_dt_jig }}</td>

                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <input
                          type="number"
                          v-model="item.dt_other"
                          class="block w-20 px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs"
                        />
                      </td>
                      <td v-else class="px-2 py-1.5" :class="!Number(item.dt_other) ? 'val-zero' : ''">{{ item.dt_other }}</td>
                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <input
                          type="text"
                          v-model="item.ket_dt_other"
                          :title="item.ket_dt_other || '-'"
                          class="block w-32 px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs text-ellipsis overflow-hidden whitespace-nowrap"
                        />
                      </td>
                      <td v-else class="px-2 py-1.5">{{ item.ket_dt_other || '-' }}</td>

                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <input
                          type="number"
                          v-model="item.dt_wip"
                          class="block w-20 px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs"
                        />
                      </td>
                      <td v-else class="px-2 py-1.5" :class="!Number(item.dt_wip) ? 'val-zero' : ''">{{ item.dt_wip }}</td>
                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <input
                          type="text"
                          v-model="item.ket_dt_wip"
                          class="block w-32 px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs text-ellipsis overflow-hidden whitespace-nowrap"
                        />
                      </td>
                      <td v-else class="px-2 py-1.5">{{ item.ket_dt_wip }}</td>

                      <td class="px-2 py-1.5" :class="!item.total_dt ? 'val-zero' : ''">{{ item.total_dt || '-' }}</td>

                      <!-- TPT & UPH actual: live (preview) → final saat simpan (read-only) -->
                      <td class="px-2 py-1.5 col-tpt-act" :class="tptLive(item) === '-' || tptLive(item) === '0.00' || tptLive(item) === 0 ? 'val-zero' : ''">{{ tptLive(item) }}</td>

                      <td class="px-2 py-1.5 col-uph-act" :class="uphLive(item) === '-' || uphLive(item) === 0 ? 'val-zero' : ''">{{ uphLive(item) }}</td>

                      <td v-if="canEditActual()" class="px-2 py-1.5">
                        <select
                          v-model="item.keterangan_actual"
                          class="ket-select block w-48 pl-2 pr-6 text-xs"
                        >
                          <option value=""></option>
                          <option v-for="k in keteranganActual" :key="k.id" :value="k.information">{{ k.information }}</option>
                        </select>
                      </td>
                      <td v-else class="px-2 py-1.5">{{ item.keterangan_actual }}</td>

                      <td class="px-2 py-1">
                        <button
                          v-if="item.part_number && item.is_running === '0'"
                          @click="updateIsRunning(getGlobalIndex(localIndex))"
                          class="text-white bg-gradient-to-r from-blue-500 to-blue-700 font-medium rounded-lg text-xs px-2 py-1.5"
                        >
                          Start
                        </button>
                        <button
                          v-else-if="item.part_number && item.is_running === '1'"
                          @click="resetIsRunning(getGlobalIndex(localIndex))"
                          class="text-white bg-gradient-to-r from-red-400 to-red-600 font-medium rounded-lg text-xs px-2 py-1.5"
                        >
                          Stop
                        </button>
                        <span v-else>-</span>
                      </td>

                      <td class="px-2 py-1">
                        <span v-if="isDone(getGlobalIndex(localIndex))" class="font-medium text-green-500">Done</span>
                        <button
                          v-else-if="item.part_number && item.is_next === '0'"
                          @click="updateIsNext(getGlobalIndex(localIndex))"
                          class="text-white bg-gradient-to-r from-green-400 to-green-600 font-medium rounded-lg text-xs px-2 py-1.5"
                        >
                          Start
                        </button>
                        <button
                          v-else-if="item.part_number && item.is_next === '1'"
                          @click="resetIsNext(getGlobalIndex(localIndex))"
                          class="text-white bg-gradient-to-r from-red-400 to-red-600 font-medium rounded-lg text-xs px-2 py-1.5"
                        >
                          Stop
                        </button>
                        <span v-else>-</span>
                      </td>
                    </tr>
                    </template>
                  </tbody>
                </table>
              </div>

              <!-- Bottom Controls -->
              <div ref="bottomCtrlRef" class="flex flex-wrap gap-4 items-center justify-between mt-4">
                <!-- Showing Text -->
                <span class="text-sm text-gray-700 w-full sm:w-auto order-2 sm:order-1">
                  Menampilkan {{ filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0 }} -
                  {{ Math.min(currentPage * pageSize, filteredData.length) }} dari {{ filteredData.length }} data
                </span>

                <!-- Save Button (Center) -->
                <div class="flex justify-center w-auto gap-3">
                  <button
                    @click="undo"
                    :disabled="!canUndo"
                    :class="!canUndo ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'"
                    class="flex gap-1 items-center text-gray-700 bg-white border border-gray-300 font-medium rounded-full text-sm px-4 py-1.5"
                    title="Batalkan perubahan terakhir (Ctrl+Z)"
                  >
                    <i class="mdi mdi-undo text-lg"></i> Undo
                  </button>
                  <button
                    v-if="canEditPlan()"
                    @click="openAddModal"
                    class="flex gap-2 text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br font-medium align-center rounded-full text-sm px-5 py-1.5 shadow-md"
                  >
                    <i class="mdi mdi-plus text-lg"></i> Add Row
                  </button>
                  <button
                    @click="saveData"
                    :disabled="!isDirty || saving"
                    :class="(!isDirty || saving) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gradient-to-br shadow-md'"
                    class="flex gap-2 items-center text-white bg-gradient-to-r from-blue-500 to-blue-700 font-medium rounded-full text-sm px-5 py-1.5"
                    :title="isDirty ? 'Simpan perubahan (Ctrl+S / Ctrl+Enter)' : 'Tidak ada perubahan'"
                  >
                    <i :class="saving ? 'mdi mdi-loading mdi-spin' : 'mdi mdi-content-save'" class="text-lg"></i>
                    {{ saving ? 'Menyimpan…' : 'Simpan Perubahan' }}
                  </button>
                </div>

                <!-- Right Controls (Search + Pagination) -->
                <div class="flex items-center justify-end gap-4 w-auto">
                  <div class="w-72 relative">
                    <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <i class="mdi mdi-magnify text-blue-500 text-lg"></i>
                    </div>
                    <input
                      type="text"
                      v-model="searchQuery"
                      class="bg-white border-2 border-blue-300 text-gray-900 text-sm rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-8 py-2.5 placeholder-gray-400"
                      placeholder="Cari Part / Job Number…"
                    />
                    <button
                      v-if="searchQuery"
                      @click="searchQuery = ''"
                      class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                      title="Bersihkan"
                    >
                      <i class="mdi mdi-close-circle"></i>
                    </button>
                  </div>

                  <div v-if="totalPages > 1" class="flex gap-2">
                    <button
                      @click="currentPage--"
                      :disabled="currentPage === 1"
                      class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 transition"
                    >
                      Prev
                    </button>
                    <span class="px-3 py-1 font-medium">{{ currentPage }} / {{ totalPages }}</span>
                    <button
                      @click="currentPage++"
                      :disabled="currentPage === totalPages"
                      class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Toggle Summary Button -->
            <div class="flex justify-end -my-2">
              <button
                @click="showSummary = !showSummary"
                class="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 font-medium transition"
              >
                <i :class="showSummary ? 'mdi mdi-eye' : 'mdi mdi-eye-off'" class="text-lg"></i>
                {{ showSummary ? 'Sembunyikan Summary & Attendance' : 'Tampilkan Summary & Attendance' }}
              </button>
            </div>

            <div v-show="showSummary" class="flex flex-col gap-6">
              <div class="flex flex-wrap lg:flex-nowrap gap-6">
                <div class="relative overflow-x-auto shadow-md sm:rounded-lg w-full lg:w-2/3 border">
                  <table class="w-full text-sm text-left text-gray-500">
                    <thead class="text-xs text-gray-700">
                      <tr>
                        <th colspan="6" class="px-2 py-1.5 text-center">TOTAL QTY</th>
                        <th rowspan="2" class="px-2 py-1.5 text-center text-lg">STROKE</th>
                        <th rowspan="2" class="px-2 py-1.5 text-center text-lg">UPH</th>
                        <th rowspan="2" class="px-2 py-1.5 text-center text-lg">TPT</th>
                      </tr>
                      <tr>
                        <th colspan="2" class="px-2 py-1.5 text-center bg-green-200">OK</th>
                        <th colspan="2" class="px-2 py-1.5 text-center bg-yellow-50">Repair</th>
                        <th colspan="2" class="px-2 py-1.5 text-center bg-red-50">Reject</th>
                      </tr>
                      <tr>
                        <th class="px-2 py-2 text-center bg-green-200">PCS</th>
                        <th class="px-2 py-2 text-center bg-green-200">%</th>
                        <th class="px-2 py-2 text-center bg-yellow-50">PCS</th>
                        <th class="px-2 py-2 text-center bg-yellow-50">%</th>
                        <th class="px-2 py-2 text-center bg-red-50">PCS</th>
                        <th class="px-2 py-2 text-center bg-red-50">%</th>
                        <th class="px-2 py-2 text-center">Total</th>
                        <th class="px-2 py-2 text-center">Average</th>
                        <th class="px-2 py-2 text-center">Minutes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="bg-white font-medium hover:bg-gray-50">
                        <td class="px-2 py-4 text-center bg-green-200 text-lg">{{ summaryData?.qty_total }}</td>
                        <td class="px-2 py-4 text-center bg-green-200 text-lg">
                          {{ utils.formatPercentOneZero(summaryData?.qty_persen) }}%
                        </td>
                        <td class="px-2 py-4 text-center bg-yellow-50 text-lg">{{ summaryData?.repair_total }}</td>
                        <td class="px-2 py-4 text-center bg-yellow-50 text-lg">
                          {{ utils.formatPercentOneZero(summaryData?.repair_persen) }}%
                        </td>
                        <td class="px-2 py-4 text-center bg-red-50 text-lg">{{ summaryData?.reject_total }}</td>
                        <td class="px-2 py-4 text-center bg-red-50 text-lg">
                          {{ utils.formatPercentOneZero(summaryData?.reject_persen) }}%
                        </td>
                        <td class="px-2 py-4 text-center text-lg">{{ utils.formatDecimaltoNumber(summaryData?.total_stroke_actual) }}</td>
                        <td class="px-2 py-4 text-center text-lg">{{ utils.formatDecimaltoNumber(summaryData?.avg_uph) }}</td>
                        <td class="px-2 py-4 text-center text-lg">{{ utils.formatDecimaltoNumber(summaryData?.tpt_total) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="shadow-md sm:rounded-lg w-full lg:w-1/3 border">
                  <table class="w-full text-sm text-left text-gray-500">
                    <thead class="bg-gray-50 text-gray-700">
                      <tr>
                        <th class="px-2 py-1.5 text-lg">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="px-2 py-1.5 text-center">{{ note }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="flex justify-center">
                <div class="relative overflow-x-auto shadow-md sm:rounded-lg w-full md:w-2/3 lg:w-1/2 border">
                  <table class="w-full text-sm text-left text-gray-500">
                    <thead class="text-xs text-gray-700">
                      <tr>
                        <th colspan="5" class="px-2 py-1.5 text-center text-lg">Σ Man Power</th>
                      </tr>
                      <tr>
                        <th class="px-2 py-1.5 text-center"></th>
                        <th class="px-2 py-1.5 text-center bg-blue-200">Standard</th>
                        <th class="px-2 py-1.5 text-center bg-green-200">Actual</th>
                        <th class="px-2 py-1.5 text-center bg-yellow-50">Sakit</th>
                        <th class="px-2 py-1.5 text-center bg-gray-100">Izin</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="role in ['Foreman', 'Checkman', 'Handling', 'Operator']" :key="role" class="bg-white hover:bg-gray-50">
                        <td class="px-2 py-1.5 text-center">{{ role }}</td>
                        <template v-for="(att, idx) in formEdit.attendance" :key="idx">
                          <template v-if="att.name_role === role">
                            <td class="px-2 py-1.5 text-center">
                              <input
                                type="number"
                                v-model="att.standard"
                                class="block w-full px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs text-ellipsis overflow-hidden whitespace-nowrap"
                              />
                            </td>
                            <td class="px-2 py-1.5 text-center">
                              <input
                                type="number"
                                v-model="att.present"
                                class="block w-full px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs text-ellipsis overflow-hidden whitespace-nowrap"
                              />
                            </td>
                            <td class="px-2 py-1.5 text-center">
                              <input
                                type="number"
                                v-model="att.sick"
                                class="block w-full px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs text-ellipsis overflow-hidden whitespace-nowrap"
                              />
                            </td>
                            <td class="px-2 py-1.5 text-center">
                              <input
                                type="number"
                                v-model="att.leave"
                                class="block w-full px-1 py-1 border border-gray-400 rounded-lg bg-gray-200 text-xs text-ellipsis overflow-hidden whitespace-nowrap"
                              />
                            </td>
                          </template>
                        </template>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ── MODAL: Tambah Planning Manual (smart-form, multi-baris) ── -->
  <!-- Saat fullscreen, teleport ke panel (elemen fullscreen) agar tetap tampil. -->
  <Teleport :to="isFullscreen ? '#ach-edit-panel' : 'body'">
    <Transition name="modal">
      <div
        v-if="showAddModal"
        class="fixed inset-0 z-[3500] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm"
        @click.self="showAddModal = false"
      >
        <div class="bg-white rounded-xl shadow-2xl w-[95%] max-w-5xl max-h-[90vh] flex flex-col">
          <div class="flex items-center justify-between px-5 py-3 border-b">
            <h2 class="text-gray-800 text-lg font-semibold">
              <i class="mdi mdi-playlist-plus text-green-600"></i>
              Tambah Planning Manual — {{ selectedArea }}
            </h2>
            <button @click="showAddModal = false" class="text-gray-400 hover:text-gray-600">
              <i class="mdi mdi-close text-2xl"></i>
            </button>
          </div>

          <div class="px-5 py-3 overflow-y-auto flex flex-col gap-3">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <p class="text-xs text-gray-500">
                Pilih part dari <strong>mutasi</strong> area ini — stok / plan / DN / MDFO ikut tampil agar
                planner tahu kondisi part. UPH / Stroke / Machine dari master. Isi <strong>Lot Size</strong> sebagai planning manual.
              </p>
              <div class="flex items-center gap-2">
                <button
                  @click="openPartPicker"
                  class="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-[#4472C4] text-[#2E5396] bg-white hover:bg-[#EEF2FF] font-semibold"
                >
                  <i class="mdi mdi-filter-variant"></i> Pilih PART / JOB NO.
                  <span v-if="addRowKeys.length" class="ml-1 px-1.5 rounded-full bg-[#4472C4] text-white text-[10px]">{{ addRowKeys.length }}</span>
                </button>
                <button @click="loadCandidates(true)" class="text-gray-400 hover:text-gray-600" title="Muat ulang data mutasi">
                  <i class="mdi" :class="candLoading ? 'mdi-loading mdi-spin' : 'mdi-refresh'"></i>
                </button>
              </div>
            </div>

            <div v-if="!addRows.length" class="border border-dashed rounded-lg p-6 text-center text-xs text-gray-400">
              <i class="mdi mdi-playlist-plus text-2xl block mb-1"></i>
              Belum ada part. Klik <b>Pilih PART / JOB NO.</b> untuk mengambil dari mutasi, atau
              <button class="text-green-600 hover:underline font-medium" @click="addAnother">tambah baris manual</button>.
            </div>

            <div
              v-for="(row, i) in addRows"
              :key="i"
              class="border rounded-lg p-3 bg-gray-50/60 flex flex-col gap-2"
            >
              <div class="grid grid-cols-12 gap-3 items-end">
                <div class="col-span-12 sm:col-span-4">
                  <label class="block text-[11px] font-medium text-gray-600 mb-1">
                    Part Number
                    <span v-if="row.status_plan" class="ml-1 px-1.5 rounded-full text-[9px] font-bold"
                      :class="row.status_plan === 'WIP' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'">{{ row.status_plan }}</span>
                    <span v-if="row.info?.already_planned" class="ml-1 px-1.5 rounded-full text-[9px] font-bold bg-gray-200 text-gray-700" title="Part sudah ada di form shift ini">sudah ada</span>
                  </label>
                  <div v-if="row.info" class="px-2 py-1.5 border border-gray-200 rounded bg-white text-xs">
                    <div class="font-semibold text-gray-800 truncate">{{ row.job_number || '-' }} · {{ row.part_number }}</div>
                    <div class="text-[10px] text-gray-500 truncate">
                      {{ row.info.part_name || row.info.car_name || '—' }}
                      <span v-if="row.info.model"> · {{ row.info.model }}</span>
                      <span v-if="row.info.customers.length"> · {{ row.info.customers.join('/') }}</span>
                    </div>
                  </div>
                  <CustomSelectSearch
                    v-else
                    v-model="row.part_number"
                    :items="partsForArea"
                    label="Pilih Part"
                    :require-type="false"
                    return-type="part_number"
                    @select="onAddSelectPart(row, $event)"
                  />
                </div>
                <div class="col-span-6 sm:col-span-2">
                  <label class="block text-[11px] font-medium text-gray-600 mb-1">Job Number</label>
                  <input :value="row.job_number" readonly class="w-full px-2 py-1.5 border border-gray-200 rounded bg-gray-100 text-xs text-gray-600" />
                </div>
                <div class="col-span-3 sm:col-span-2">
                  <label class="block text-[11px] font-medium text-gray-600 mb-1">Machine</label>
                  <input :value="row.mc_weld" readonly class="w-full px-2 py-1.5 border border-gray-200 rounded bg-gray-100 text-xs text-gray-600" />
                </div>
                <div class="col-span-3 sm:col-span-1">
                  <label class="block text-[11px] font-medium text-gray-600 mb-1">UPH</label>
                  <input :value="row.uph_plan" readonly class="w-full px-2 py-1.5 border border-gray-200 rounded bg-gray-100 text-xs text-gray-600" />
                </div>
                <div class="col-span-4 sm:col-span-1">
                  <label class="block text-[11px] font-medium text-gray-600 mb-1" title="Plan dari LKH">LKH</label>
                  <input :value="row.plan_lkh" readonly class="w-full px-2 py-1.5 border border-gray-200 rounded bg-amber-50 text-xs text-amber-700" />
                </div>
                <div class="col-span-6 sm:col-span-1">
                  <label class="block text-[11px] font-semibold text-blue-700 mb-1">Lot Size</label>
                  <input
                    type="number"
                    v-model="row.lotsize"
                    class="w-full px-2 py-1.5 border-2 border-blue-300 rounded bg-white text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div class="col-span-2 sm:col-span-1 flex justify-end">
                  <button @click="removeAddRow(i)" class="text-red-500 hover:text-red-700" title="Hapus baris">
                    <i class="mdi mdi-delete text-xl"></i>
                  </button>
                </div>
              </div>

              <!-- Strip info MUTASI — angka yg sama dgn halaman mutasi, utk konteks planner -->
              <div v-if="row.info" class="grid grid-cols-4 sm:grid-cols-8 gap-1 text-[10px] bg-white border border-gray-200 rounded px-2 py-1.5">
                <div title="Stok sebelum shift ini (mutasi)">
                  <div class="text-gray-400">Stok sblm</div>
                  <div class="font-bold tabular-nums" :class="row.info.stock_before < 0 ? 'text-red-600' : 'text-blue-700'">{{ fmtN(row.info.stock_before) }}</div>
                </div>
                <div title="Plan mutasi shift ini (day+night tanggal ini dalam kurung)">
                  <div class="text-gray-400">Plan mutasi</div>
                  <div class="font-bold tabular-nums text-violet-700">{{ fmtN(row.info.plan_shift) }} <span class="text-gray-400 font-normal">({{ fmtN(row.info.plan_day_total) }})</span></div>
                </div>
                <div title="DN shift ini / DN bulan">
                  <div class="text-gray-400">DN shift / bln</div>
                  <div class="font-bold tabular-nums text-amber-700">{{ fmtN(row.info.dn_shift) }} <span class="text-gray-400 font-normal">/ {{ fmtN(row.info.dn_month) }}</span></div>
                </div>
                <div title="MDFO bulan ini">
                  <div class="text-gray-400">MDFO bln</div>
                  <div class="font-bold tabular-nums text-gray-700">{{ fmtN(row.info.mdfo_month) }}</div>
                </div>
                <div title="Aktual produksi s.d. shift sebelumnya">
                  <div class="text-gray-400">Actual MTD</div>
                  <div class="font-bold tabular-nums text-gray-700">{{ fmtN(row.info.actual_mtd) }}</div>
                </div>
                <div title="Balance shift ini (actual − plan)">
                  <div class="text-gray-400">Balance</div>
                  <div class="font-bold tabular-nums" :class="row.info.balance_shift < 0 ? 'text-red-600' : 'text-emerald-600'">{{ fmtN(row.info.balance_shift) }}</div>
                </div>
                <div title="Strength (jam) shift ini — < 8 jam kritis">
                  <div class="text-gray-400">Strength</div>
                  <div class="font-bold tabular-nums" :class="row.info.strength_shift && row.info.strength_shift < 8 ? 'text-red-600' : 'text-emerald-600'">{{ row.info.strength_shift ? row.info.strength_shift.toFixed(1) + ' jam' : '-' }}</div>
                </div>
                <div title="Proyeksi stok setelah shift = stok sblm + lot size − DN shift">
                  <div class="text-gray-400">Stok stlh (proj.)</div>
                  <div class="font-bold tabular-nums" :class="(stockAfter(row) ?? 0) < 0 ? 'text-red-600' : 'text-emerald-700'">{{ fmtN(stockAfter(row)) }}</div>
                </div>
              </div>
              <div v-if="row.loading" class="text-[11px] text-blue-500">
                <i class="mdi mdi-loading mdi-spin"></i> Mengambil data master…
              </div>
            </div>

            <button
              v-if="addRows.length"
              @click="addAnother"
              class="self-start flex items-center gap-1 text-sm text-green-600 hover:text-green-800 font-medium"
            >
              <i class="mdi mdi-plus-circle"></i> Tambah baris manual
            </button>
          </div>

          <div class="flex justify-end gap-3 px-5 py-3 border-t">
            <button @click="showAddModal = false" class="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">
              Batal
            </button>
            <button @click="confirmAddRows" class="px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium">
              <i class="mdi mdi-check"></i> Tambahkan
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Picker part dari mutasi (gaya filter mutasi) -->
  <PartPickerMutasi
    :show="showPartPicker"
    :items="partCandidates"
    :loading="candLoading"
    :area="selectedArea"
    :date="filter.date"
    :shift="filter.shift"
    :teleport-to="isFullscreen ? '#ach-edit-panel' : 'body'"
    :preselected="addRowKeys"
    @close="showPartPicker = false"
    @apply="applyPicked"
  />
</template>

<style scoped>
.lock-dot { animation: lock-pulse 1.6s ease-in-out infinite; }
@keyframes lock-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7); }
  50% { box-shadow: 0 0 0 4px rgba(52, 211, 153, 0); }
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.table-wrapper {
  overflow-x: auto;
}
table {
  border-collapse: separate;
  border-spacing: 0;
}
thead th {
  position: sticky;
  top: 0;
  z-index: 10;
}
/* top per baris header di-set inline oleh syncHeaderOffsets() (diukur nyata) */
/* Pola sama dgn LKHDualTable: tiap sel HANYA border kanan+bawah (tanpa left/top →
   tidak ada garis ganda di sel pertama tiap baris header: "pcs" adalah first-child
   baris 4 → dulu dapat border-left ekstra → garis tebal). Bingkai luar dari wrapper. */
thead th,
tbody td {
  border: 0;
  /* Garis via inset box-shadow, BUKAN border: pada lebar sub-piksel (w-full di layar
     penuh) sel sticky berikutnya menimpa border kanan sel sebelumnya (garis "hilang").
     box-shadow digambar DI DALAM sel sendiri → tidak bisa tertimpa tetangga. */
  box-shadow: inset -1px -1px 0 #111827;
  box-sizing: border-box;
  background-clip: padding-box;
}
.table-wrapper { border: 1px solid #111827; border-radius: 4px; }
thead th { vertical-align: middle; line-height: 1.1; padding-top: 2px !important; padding-bottom: 2px !important; }
/* Tinggi baris header PASTI → offset sticky + rowspan pas, tidak ada celah/tumpang */
.ach-tbl thead tr:nth-child(1) th { height: 22px; }
.ach-tbl thead tr:nth-child(2) th { height: 32px; }
.ach-tbl thead tr:nth-child(3) th { height: 22px; }
.ach-tbl thead tr:nth-child(4) th { height: 22px; }
.ach-tbl thead tr:nth-child(2) th[rowspan="3"] { height: 76px; }
.ach-tbl thead tr:nth-child(2) th[rowspan="2"] { height: 54px; }
.ach-tbl thead tr:nth-child(3) th[rowspan="2"] { height: 44px; }
/* Semua cell data hitam pekat */
tbody td {
  color: #111827;
}
/* Nilai nol atau strip → abu-abu italic */
tbody td.val-zero {
  color: #9ca3af;
  font-style: italic;
}

/* Freeze Part Number (kolom 2) & Job Number (kolom 3) — setelah kolom Urut & Patan dihapus */
thead tr:nth-child(2) th:nth-child(2),
tbody td:nth-child(2) {
  position: sticky !important;
  left: 0 !important;
  min-width: 141px !important;
  z-index: 12 !important;
  background-color: #bfdbfe !important;
}
tbody td:nth-child(2) {
  background-color: #fff !important;
  z-index: 8 !important;
}

thead tr:nth-child(2) th:nth-child(3),
tbody td:nth-child(3) {
  position: sticky !important;
  left: 141px !important;
  z-index: 12 !important;
  background-color: #bfdbfe !important;
}
tbody td:nth-child(3) {
  background-color: #fff !important;
  z-index: 8 !important;
}

/* Layar penuh (Fullscreen API) */
.fs-panel:fullscreen {
  width: 100vw !important;
  height: 100vh !important;
  max-width: none !important;
  max-height: none !important;
  border-radius: 0 !important;
  background: #fff;
}

/* Banner grup MESIN (ala LKH/SAP) — label tetap terlihat saat scroll horizontal */
.machine-group td {
  background: #eef2ff !important;
  border-top: 2px solid #c7d2fe !important;
  border-bottom: 1px solid #c7d2fe !important;
}
.machine-group .mc-banner {
  position: sticky;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  color: #3730a3;
  font-size: 12px;
  white-space: nowrap;
}
/* Zigzag kolom Machine: proses ganjil rata-kiri, genap rata-kanan (jejak alur antar mesin) */
.zig-input { display: inline-block; }
td.zig-left { text-align: left; }
td.zig-right { text-align: right; background: linear-gradient(90deg, transparent 60%, #eef2ff); }

/* Reserve ruang scrollbar agar tidak terjadi layout shift saat muncul/hilang */
.scroll-stable { scrollbar-gutter: stable; }

/* Promosi sticky header ke compositor layer — cegah repaint jitter */
thead th { will-change: transform; }

/* Sembunyikan spinner number input agar tidak menggeser lebar kolom saat hover */
input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }

/* Lebar kolom TPT & UPH actual tetap agar tidak goyang saat nilai berubah */
td.col-tpt-act, td.col-uph-act { min-width: 52px; }
td.zig-left  { background: linear-gradient(90deg, #eef2ff 40%, transparent); }

/* Banner LINE (induk) — lebih tegas dari mesin */
.line-group td {
  background: #312e81 !important;
  border-top: 2px solid #1e1b4b !important;
}
.line-group .mc-banner.line-banner { color: #fff; padding: 5px 12px; font-size: 13px; }
.line-group .mc-banner .line-count {
  background: rgba(255,255,255,.22); color: #fff;
  border-radius: 999px; padding: 0 8px; font-size: 10px; font-weight: 700;
}

.machine-group .mc-banner .mc-count {
  background: #6366f1;
  color: #fff;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 10px;
  font-weight: 700;
}

/* Zebra antar baris + hover lembut (keterbacaan ala Excel) */
tbody tr.bg-white:nth-of-type(even) td { background-color: #fafbfc; }

/* Sel input aktif terlihat jelas — foreman selalu tahu posisi kursor */
.table-wrapper input:focus,
.table-wrapper select:focus {
  outline: 2px solid #2563eb;
  outline-offset: -1px;
  background-color: #eff6ff !important;
  position: relative;
  z-index: 9;
}

/* ── Saklar OP: baris proses antara ── */
.op-sub td { background: #f8fafc !important; color: #64748b; font-size: 11px; border-bottom: 1px dashed #e2e8f0; }
.op-sub-note { font-style: italic; color: #94a3b8; }
.op-badge {
  display: inline-block; padding: 1px 6px; border-radius: 999px;
  background: #eef2ff; color: #4338ca; font-size: 10px; font-weight: 700; letter-spacing: 0.02em;
}

/* ── Dropdown keterangan: chevron kecil & rapi (override 18px bawaan Flowbite) ── */
.table-wrapper select.ket-select {
  background-size: 12px 12px;
  background-position: right 6px center;
  height: 28px;
  border-radius: 8px;
  border-color: transparent;
  background-color: #f3f4f6;
  color: #111827;
  cursor: pointer;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background-color 0.15s, border-color 0.15s;
}
.table-wrapper select.ket-select:hover { background-color: #e5e7eb; }
</style>
