<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import { useAuthStore } from '@/stores/auth';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useAchievementWld } from '@/stores/Welding/Transaction/Achievement_v2';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import ModalViewAchievement_v2 from '@/components/welding/Production/ModalViewAchievement_v2.vue';
import ModalEditAchievement_v2 from '@/components/welding/Production/ModalEditAchievement_v2.vue';
import socket from '@/plugins/socket';

const store = useAchievementWld();
const {
  cleanData,
  selectedPrefixArea, // ← was selectedPrefixLine
  selectedArea, // ← was selectedLineId
  filter,
  locks
} = storeToRefs(store);

const router = useRouter();
const auth = useAuthStore();

// Helper tanggal LOKAL — JANGAN panggil action store (utils.dateMonth) di template/onMounted:
// pada navigasi SPA pertama instance utility kadang belum siap → "utils.dateMonth is not a
// function" → onMounted throw SEBELUM fetchData → data tak termuat + render v-else blank.
// Hard reload kebetulan meng-init utility lebih dulu → seolah normal. Helper lokal = anti-bom.
const monthMap = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const dateMonth = (value: string) => {
  if (!value) return '';
  const p = String(value).split('-');
  return `${p[2] ?? ''} ${monthMap[parseInt(p[1] ?? '0', 10)] ?? ''} ${p[0] ?? ''}`.trim();
};

const page = ref({ title: 'Achievement Welding v2' });
const breadcrumbs = shallowRef([
  { title: 'Welding', disabled: true, href: '#' },
  { title: 'Transaction', disabled: true, href: '#' },
  { title: 'Achievement', disabled: true, href: '#' }
]);

// ── Realtime: silent refresh saat Mutasi plan berubah ────────────
let achDebounce: ReturnType<typeof setTimeout> | null = null
function onMutasiUpdate() {
  if (achDebounce) clearTimeout(achDebounce)
  // refreshAchievement = ringan: tanpa overlay loading, tanpa master part/keterangan.
  achDebounce = setTimeout(() => store.refreshAchievement(), 800)
}

// ── Realtime: lock form berubah (open / takeover / close) → update badge kartu ──
// Socket server hanya merelay 'updateAcievementWelding' → 'refreshAcievementWelding'
// (event custom dibuang), jadi backend menumpangi channel itu dgn kind='achLock'.
function onLockChanged(p: any) {
  if (!p || p.kind === 'presence') return;             // user masuk/keluar Mutasi, bukan data
  if (p.kind === 'achView') {                          // buka/tutup modal View → segarkan presence
    if (p.date === filter.value.date && String(p.shift) === String(filter.value.shift)) store.fetchLocks();
    return;
  }
  if (p.kind !== 'achLock') { onMutasiUpdate(); return; }   // mutasi / achievement lain → refresh plan
  if (p.date !== filter.value.date || String(p.shift) !== String(filter.value.shift)) return;
  const l = p.locks;
  if (!l || (!l.plan && !l.actual)) {
    const { [p.area]: _drop, ...rest } = locks.value;
    locks.value = rest;
  } else {
    locks.value = { ...locks.value, [p.area]: l };
  }
}

// Jam berjalan untuk label "sejak X mnt" pada badge lock
const nowTick = ref(Date.now());
let tickTimer: ReturnType<typeof setInterval> | null = null;

// Socket sempat putus → event terlewat. Saat tersambung lagi: tarik ulang data + lock.
let firstConnect = true;
function onSocketConnect() {
  if (firstConnect) { firstConnect = false; return; }
  store.fetchLocks();
  onMutasiUpdate();
}

onMounted(async () => {
  page.value.title = `Achievement Welding - ${dateMonth(filter.value.date)} Shift ${filter.value.shift}`;
  await store.fetchData();
  socket.on('refreshAcievementWelding', onLockChanged);
  firstConnect = !socket.connected;   // sudah tersambung → 'connect' berikutnya pasti reconnect
  socket.on('connect', onSocketConnect);
  if (!socket.connected) socket.connect();
  tickTimer = setInterval(() => { nowTick.value = Date.now(); store.fetchLocks(); }, 30000);
});

onUnmounted(() => {
  if (achDebounce) clearTimeout(achDebounce);
  if (tickTimer) clearInterval(tickTimer);
  socket.off('refreshAcievementWelding', onLockChanged);
  socket.off('connect', onSocketConnect);
});

const me = computed(() => auth.user?.username || '');

// ── Pembatasan area per user ─────────────────────────────────────
// Permission child per area: `Transaction.Area.AchievementWeldingV2:<AREA>` (diatur di
// Manage User). Admin / user tanpa satu pun permission area → lihat semua area.
const AREA_PERM = 'Transaction.Area.AchievementWeldingV2:';
const allowedAreas = computed<Set<string> | null>(() => {
  if (auth.group === '1') return null;
  const list = (auth.authorization as string[]).filter((p) => p.startsWith(AREA_PERM)).map((p) => p.slice(AREA_PERM.length));
  return list.length ? new Set(list) : null;
});
const areaAllowed = (area: string) => !allowedAreas.value || allowedAreas.value.has(area);
const visibleData = computed(() =>
  cleanData.value
    .map((g) => ({ ...g, detail: g.detail.filter((d: any) => areaAllowed(d.line_id)) }))
    .filter((g) => g.detail.length > 0)
);
// Kunci form = 1 akun per area: pemegang mengambil kedua slot (plan & actual) sekaligus.
// lockOf = lock slot saya (store.mySlots) yg dipegang orang lain.
const slotLocks = (area: string) => locks.value[area] ?? null;
// Presence kartu: editor (1 akun, dari lock) + pembuka View (banyak). 1 baris per user, editor menang.
interface PresenceRow { user: string; fullname: string | null; is_admin: boolean; dept: string | null; mode: 'Edit' | 'View'; opened_at: string }
const presenceOf = (area: string): PresenceRow[] => {
  const seen = new Set<string>();
  const rows: PresenceRow[] = [];
  for (const sl of ['plan', 'actual'] as const) {
    const l = slotLocks(area)?.[sl];
    if (l && !seen.has(l.user)) { seen.add(l.user); rows.push({ ...l, dept: l.dept ?? null, mode: 'Edit' }); }
  }
  for (const v of store.viewers[area] ?? []) {
    if (!seen.has(v.user)) { seen.add(v.user); rows.push({ ...v, mode: 'View', opened_at: v.since }); }
  }
  return rows;
};
const lockOf = (area: string) => {
  const l = slotLocks(area); if (!l) return null;
  for (const sl of store.mySlots) { const x = l[sl]; if (x && x.user !== me.value) return x; }
  return null;
};
const lockIsMine = (area: string) => {
  const l = slotLocks(area); if (!l) return false;
  return store.mySlots.some((sl) => l[sl]?.user === me.value) && !lockOf(area);
};
const initials = (l: { user: string; fullname: string | null } | null) => {
  const n = (l?.fullname || l?.user || '?').trim();
  return n.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
};
const sinceLabel = (l: { opened_at: string } | null) => {
  if (!l?.opened_at) return '';
  const ms = nowTick.value - Date.parse(l.opened_at.replace(' ', 'T'));
  const m = Math.max(0, Math.floor(ms / 60000));
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt`;
  return `${Math.floor(m / 60)} jam ${m % 60} mnt`;
};

const viewAll = (prefix: string) => {
  selectedPrefixArea.value = prefix;
  router.push({ name: 'production-welding-achievement-v2-showline' });
};

const viewDetail = (prefix: string, area: string) => {
  selectedPrefixArea.value = prefix;
  selectedArea.value = area;
  store.isModalViewOpen = true;
};

// ── Dialog "form terkunci" (tampil bila open ditolak backend) ──
const lockDialog = ref<{ area: string; prefix: string; lock: any } | null>(null);
const opening = ref<string | null>(null);

const editData = async (prefix: string, area: string, force = false) => {
  if (opening.value) return;
  selectedPrefixArea.value = prefix;
  selectedArea.value = area;
  opening.value = area;
  try {
    const ok = await store.openFormEditById(area, force);
    if (ok) {
      lockDialog.value = null;
      store.isModalEditOpen = true;
      return;
    }
    // Ditolak → tampilkan siapa yang memegang + opsi ambil alih
    lockDialog.value = { area, prefix, lock: store.currentUser.lock ?? { user: store.currentUser.user } };
  } finally {
    opening.value = null;
  }
};
const lockDialogHolderIsAdmin = computed(() => !!lockDialog.value?.lock?.is_admin);
const iAmAdmin = computed(() => me.value.toLowerCase() === 'administrator');
const canTakeOver = computed(() => !!lockDialog.value && (iAmAdmin.value || !lockDialogHolderIsAdmin.value));
const takeOverFromDialog = () => {
  if (!lockDialog.value || !canTakeOver.value) return;
  editData(lockDialog.value.prefix, lockDialog.value.area, true);
};

const filterData = async () => {
  page.value.title = `Achievement Welding - ${dateMonth(filter.value.date)} Shift ${filter.value.shift}`;
  await store.fetchData();
};

</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <div class="flex flex-col gap-8">
    <!-- Actions: filter inline (date + shift) — style pill sama dgn tombol -->
    <div class="flex flex-wrap gap-3 items-center">
      <label
        class="flex items-center gap-2 h-fit text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 font-medium rounded-full text-sm pl-4 pr-2 py-1.5"
      >
        <i class="mdi mdi-calendar-month text-xl leading-none"></i>
        <span>Date</span>
        <input
          type="date"
          v-model="filter.date"
          @change="filterData"
          class="bg-white/15 border border-white/30 text-white text-sm rounded-full px-3 py-1 outline-none focus:ring-2 focus:ring-white/60 [color-scheme:dark]"
        />
      </label>
      <label
        class="flex items-center gap-2 h-fit text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 font-medium rounded-full text-sm pl-4 pr-2 py-1.5"
      >
        <i class="mdi mdi-weather-sunset text-xl leading-none"></i>
        <span>Shift</span>
        <select
          v-model="filter.shift"
          @change="filterData"
          class="bg-white/15 border border-white/30 text-white text-sm rounded-full px-3 py-1 outline-none focus:ring-2 focus:ring-white/60 [&>option]:text-gray-900"
        >
          <option value="1">Shift 1 (Day)</option>
          <option value="2">Shift 2 (Night)</option>
        </select>
      </label>
      <span class="self-center text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1" title="Plan = mutasi_weld/mutasi_wip. Perubahan Mutasi masuk realtime lewat socket.">
        <i class="mdi mdi-link-variant text-base"></i>
        Plan realtime dari Mutasi
      </span>
    </div>

    <!-- Cards -->
    <div v-if="visibleData.length > 0" class="flex flex-col gap-8 mt-5">
      <div v-for="(group, i) in visibleData" :key="i" class="flex flex-col gap-4">
        <!-- Group Title -->
        <h2 class="text-xl font-bold text-gray-700 border-b pb-2 dark:text-slate-100 dark:border-slate-700">{{ group.prefix_area }}</h2>
        
        <!-- Cards for each area in the group -->
        <div class="flex flex-wrap gap-5">
          <div
            v-for="(item, j) in group.detail"
            :key="j"
            class="ach-card relative rounded-xl shadow bg-[#182747] text-white hover:shadow-lg transition hover-menu h-fit min-w-[16rem]"
            :class="{
              'ach-card--locked': lockOf(item.line_id) && !lockIsMine(item.line_id),
              'ach-card--mine': lockIsMine(item.line_id),
            }"
          >
            <!-- Header card -->
            <div class="p-5 pb-3 flex justify-between items-start gap-4">
              <span class="text-lg font-semibold">{{ item.line_id }}</span>
              <div class="flex items-center gap-1 shrink-0">
                <button
                  @click="viewDetail(group.prefix_area, item.line_id)"
                  class="w-7 h-7 flex items-center justify-center rounded-full text-white bg-blue-500 border border-blue-500 hover:bg-blue-400"
                  title="View"
                >
                  <i class="mdi mdi-eye text-sm"></i>
                </button>
                <button
                  @click="editData(group.prefix_area, item.line_id)"
                  :disabled="opening === item.line_id"
                  class="px-2.5 py-1 text-xs rounded-md border text-white flex items-center gap-1 transition"
                  :class="lockOf(item.line_id) && !lockIsMine(item.line_id)
                    ? 'bg-amber-500/90 border-amber-400 hover:bg-amber-400'
                    : 'bg-green-500 border-green-500 hover:bg-green-400'"
                  :title="lockOf(item.line_id) && !lockIsMine(item.line_id)
                    ? `Sedang diedit oleh ${lockOf(item.line_id)?.fullname || lockOf(item.line_id)?.user}`
                    : 'Edit'"
                >
                  <i v-if="opening === item.line_id" class="mdi mdi-loading mdi-spin"></i>
                  <i v-else-if="lockOf(item.line_id) && !lockIsMine(item.line_id)" class="mdi mdi-lock"></i>
                  <i v-else-if="lockIsMine(item.line_id)" class="mdi mdi-pencil"></i>
                  {{ lockOf(item.line_id) && !lockIsMine(item.line_id) ? 'Terkunci' : lockIsMine(item.line_id) ? 'Lanjut' : 'Edit' }}
                </button>
              </div>
            </div>

            <!-- Presence: editor (1 akun) + pembuka View (banyak) — "Dept · Edit/View · sejak" -->
            <div v-if="presenceOf(item.line_id).length" class="mx-4 mb-3 flex flex-col gap-1.5">
              <div
                v-for="e in presenceOf(item.line_id)"
                :key="e.user"
                class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs"
                :class="e.user === me ? 'bg-blue-500/20 text-blue-100' : e.mode === 'Edit' ? 'bg-amber-500/15 text-amber-100' : 'bg-white/10 text-gray-200'"
              >
                <span
                  class="relative w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold shrink-0"
                  :class="e.user === me ? 'bg-blue-500' : e.mode === 'Edit' ? 'bg-amber-500' : 'bg-slate-500'"
                >
                  {{ initials(e) }}
                  <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#182747] presence-dot"></span>
                </span>
                <span class="min-w-0 leading-tight">
                  <span class="block font-semibold truncate">
                    {{ e.user === me ? 'Anda' : (e.fullname || e.user) }}
                    <i v-if="e.is_admin" class="mdi mdi-shield-crown text-amber-300" title="Administrator"></i>
                  </span>
                  <span class="block opacity-75">
                    {{ e.dept || '-' }} · <i :class="e.mode === 'Edit' ? 'mdi mdi-pencil' : 'mdi mdi-eye'"></i> {{ e.mode }} · {{ sinceLabel(e) }}
                  </span>
                </span>
              </div>
            </div>

            <!-- Mini summary -->
            <div v-if="item.summary_data" class="px-5 pb-3 text-xs text-gray-300 flex justify-between">
              <span>Part: <strong class="text-blue-400">{{ item.summary_data?.part_count ?? 0 }}</strong></span>
              <span>Ach: <strong class="text-green-400">{{ (item.summary_data?.ach_avg ?? 0).toFixed(0) }}%</strong></span>
              <span class="truncate" :title="item.summary_data?.updated || '-'">Updated: {{ (item.summary_data?.updated || '').substring(11, 16) || '-' }}</span>
            </div>

            <!-- Patan -->
            <div v-if="item.patan" class="px-5 pb-3 text-xs text-gray-400">Patan: {{ item.patan }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex w-full justify-center mt-16">
      <p class="text-gray-400 text-center text-xl font-medium">
        Tidak ada data untuk<br />{{ dateMonth(filter.date) }} Shift {{ filter.shift }}
      </p>
    </div>
  </div>

  <!-- Dialog: form sedang dikunci user lain -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="lockDialog"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm"
        @click.self="lockDialog = null"
      >
        <div class="lock-dialog bg-white rounded-2xl shadow-2xl w-[26rem] max-w-[95vw] overflow-hidden">
          <div class="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"></div>
          <div class="p-6 flex flex-col items-center text-center gap-3">
            <div class="relative">
              <div class="w-16 h-16 rounded-full grid place-items-center text-xl font-bold text-white bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg">
                {{ initials(lockDialog.lock) }}
              </div>
              <span class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white grid place-items-center shadow">
                <i class="mdi mdi-lock text-amber-600"></i>
              </span>
            </div>
            <h2 class="text-lg font-bold text-gray-800">Form sedang dibuka</h2>
            <p class="text-sm text-gray-600">
              Area <strong class="text-gray-800">{{ lockDialog.area }}</strong> sedang diedit oleh
              <strong class="text-gray-800">{{ lockDialog.lock?.fullname || lockDialog.lock?.user }}</strong>
              <span v-if="lockDialog.lock?.is_admin" class="ml-1 inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 align-middle">
                <i class="mdi mdi-shield-crown"></i> Admin
              </span>
              <span v-if="lockDialog.lock?.opened_at" class="block text-xs text-gray-400 mt-1">sejak {{ sinceLabel(lockDialog.lock) }} yang lalu</span>
            </p>
            <p v-if="lockDialogHolderIsAdmin && !iAmAdmin" class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              Form dibuka administrator — tidak dapat diambil alih. Tunggu sampai ditutup.
            </p>
            <p v-else class="text-xs text-gray-500">
              Form hanya bisa dibuka 1 akun. Ambil alih menutup form di sisi mereka; perubahan belum disimpan bisa hilang.
            </p>
            <div class="flex gap-2 w-full mt-2">
              <button
                @click="lockDialog = null"
                class="flex-1 text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 font-medium rounded-lg text-sm px-4 py-2.5"
              >
                Tutup
              </button>
              <button
                @click="viewDetail(lockDialog.prefix, lockDialog.area); lockDialog = null"
                class="flex-1 text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 font-medium rounded-lg text-sm px-4 py-2.5"
              >
                <i class="mdi mdi-eye"></i> Lihat saja
              </button>
              <button
                v-if="canTakeOver"
                @click="takeOverFromDialog"
                :disabled="!!opening"
                class="flex-1 text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 font-semibold rounded-lg text-sm px-4 py-2.5 disabled:opacity-60"
              >
                <i :class="opening ? 'mdi mdi-loading mdi-spin' : 'mdi mdi-account-switch'"></i> Ambil alih
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <ModalViewAchievement_v2 />
  <ModalEditAchievement_v2 />
</template>

<style scoped>
.hover-menu {
  transition: transform 0.3s ease-in-out;
}
.hover-menu:hover {
  transform: scale(1.05);
}
.ach-card { border-top: 5px solid #2563eb; }
.ach-card--mine { border-top-color: #3b82f6; box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.5), 0 8px 24px rgba(59, 130, 246, 0.25); }
.ach-card--locked { border-top-color: #f59e0b; box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.5), 0 8px 24px rgba(245, 158, 11, 0.2); }
.presence-dot { animation: presence-pulse 1.6s ease-in-out infinite; }
@keyframes presence-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7); }
  50% { box-shadow: 0 0 0 5px rgba(52, 211, 153, 0); }
}
.lock-dialog { animation: lock-pop 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.2); }
@keyframes lock-pop { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
