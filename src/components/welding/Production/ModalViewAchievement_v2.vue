<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
import { useAchievementWld } from '@/stores/Welding/Transaction/Achievement_v2';
import { storeToRefs } from 'pinia';
import type { Attendance, Detail, SummaryData } from '@/types/Welding/Transaction/Achievement_v2';
import { useUtilityStore } from '@/stores/utility';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import OpSplitToggle from '@/components/welding/Production/OpSplitToggle.vue';
import { midOps, lastOp } from '@/utils/achOps';

const storeAch = useAchievementWld();
const { cleanData, selectedPrefixArea, selectedArea, currentUser, currentPatan, isModalViewOpen, splitOp } = storeToRefs(storeAch);

const utils = useUtilityStore();
const authStore = useAuthStore();

const dataTable = ref<Detail[]>([]);
const note = ref<string>('-');
const summaryData = ref<SummaryData>();
const attendance = ref<Attendance[]>([]);

const loadData = () => {
  dataTable.value = [];
  note.value = '-';
  summaryData.value = undefined;
  attendance.value = [];

  cleanData.value.forEach((group) => {
    if (group.prefix_area !== selectedPrefixArea.value) return;
    group.detail.forEach((item) => {
      if (item.line_id === selectedArea.value) {
        currentPatan.value = item.patan ?? '';
        note.value = item.note ?? '-';
        summaryData.value = item.summary_data;
        attendance.value = item.attendance;
        dataTable.value = item.detail;
      }
    });
  });

  if (attendance.value.length === 0) {
    attendance.value = ['Foreman', 'Checkman', 'Handling', 'Operator'].map((role) => ({
      DATE: '-',
      line_id: '-',
      shift: '-',
      name_role: role,
      standard: '-',
      present: '-',
      sick: '-',
      leave: '-'
    }));
  }
  currentPage.value = 1;
};

const currentPage = ref(1);
const showSummary = ref(false);
const searchQuery = ref('');

const filteredData = computed(() => {
  if (!searchQuery.value) return dataTable.value;
  const q = searchQuery.value.toLowerCase();
  return dataTable.value.filter((item) => item.part_number?.toLowerCase().includes(q) || item.job_number?.toLowerCase().includes(q));
});

// ── Paginasi muat-layar (tanpa scroll vertikal di 100%) ──
// Kapasitas baris = tinggi area tabel ÷ tinggi baris (diukur ResizeObserver). Mode OP Pisah:
// baris proses antara ikut dihitung (lebih pendek → bobot subCost), 1 halaman = part utuh.
const wrapRef = ref<HTMLElement | null>(null);
const rowBudget = ref(16);
const subCost = ref(0.7);
const measure = () => {
  const w = wrapRef.value;
  // Summary terbuka → tinggi tabel = isinya (bukan sisa layar); pertahankan kapasitas terakhir.
  if (!w || showSummary.value) return;
  const head = w.querySelector('thead') as HTMLElement | null;
  const main = w.querySelector('tbody tr.row-main') as HTMLElement | null;
  const sub = w.querySelector('tbody tr.op-sub') as HTMLElement | null;
  const rowH = main?.offsetHeight || 40;
  if (sub && main) subCost.value = sub.offsetHeight / rowH;
  const scrollbar = w.scrollWidth > w.clientWidth ? 14 : 0;
  rowBudget.value = Math.max(5, Math.floor((w.clientHeight - (head?.offsetHeight ?? 90) - scrollbar) / rowH));
};
let ro: ResizeObserver | null = null;
watch(wrapRef, (el, old) => {
  if (old) ro?.unobserve(old);
  if (!el) return;
  ro ??= new ResizeObserver(() => measure());
  ro.observe(el);
  nextTick(measure);
});
onBeforeUnmount(() => ro?.disconnect());

// Awal tiap halaman (indeks di filteredData)
const pageStarts = computed(() => {
  const starts: number[] = [];
  let cost = 0;
  filteredData.value.forEach((it, i) => {
    const c = 1 + (splitOp.value ? midOps(it).length * subCost.value : 0);
    if (i === 0 || cost + c > rowBudget.value) { starts.push(i); cost = 0; }
    cost += c;
  });
  return starts.length ? starts : [0];
});
const totalPages = computed(() => (filteredData.value.length ? pageStarts.value.length : 0));
const pageStart = computed(() => pageStarts.value[Math.min(currentPage.value, pageStarts.value.length) - 1] ?? 0);
const pageEnd = computed(() => pageStarts.value[currentPage.value] ?? filteredData.value.length);
const paginatedData = computed(() => filteredData.value.slice(pageStart.value, pageEnd.value));
// Kapasitas berubah (resize / saklar OP) → halaman tetap valid
watch(totalPages, (n) => { if (currentPage.value > Math.max(1, n)) currentPage.value = Math.max(1, n); });
watch([splitOp, paginatedData], () => nextTick(measure));

watch(searchQuery, () => {
  currentPage.value = 1;
});

const getGlobalIndex = (localIndex: number) => pageStart.value + localIndex;

watch(isModalViewOpen, (newVal) => {
  if (newVal) {
    loadData();
    startViewing();
  } else {
    stopViewing();
  }
});

// Presence View: umumkan "sedang melihat" area ini (boleh banyak orang), heartbeat 20 dtk.
let viewTimer: ReturnType<typeof setInterval> | null = null;
let viewingArea = '';
const nowTick = ref(Date.now());
function startViewing() {
  stopViewing();
  viewingArea = selectedArea.value;
  storeAch.pingViewer(viewingArea);
  viewTimer = setInterval(() => { nowTick.value = Date.now(); storeAch.pingViewer(viewingArea); }, 20000);
}

// Chip header: siapa yang membuka area ini — editor (1 akun, dari lock) + pembuka View (banyak).
const presenceChips = computed(() => {
  const area = selectedArea.value;
  const me = authStore.user?.username;
  const seen = new Set<string>();
  const out: { user: string; name: string; initials: string; dept: string; mode: 'Edit' | 'View'; since: string; me: boolean; isAdmin: boolean }[] = [];
  const add = (user: string, fullname: string | null, dept: string | null | undefined, isAdmin: boolean, mode: 'Edit' | 'View', at?: string) => {
    if (seen.has(user)) return;
    seen.add(user);
    const name = (fullname || user || '').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const m = at ? Math.max(0, Math.floor((nowTick.value - Date.parse(at.replace(' ', 'T'))) / 60000)) : 0;
    out.push({
      user, name: parts.length > 2 ? `${parts[0]} ${parts[1]}` : name,
      initials: parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?',
      dept: dept || '-', mode, me: user === me, isAdmin,
      since: m < 1 ? 'baru saja' : m < 60 ? `${m} mnt` : `${Math.floor(m / 60)} jam ${m % 60} mnt`,
    });
  };
  for (const sl of ['plan', 'actual'] as const) {
    const l = storeAch.locks[area]?.[sl];
    if (l) add(l.user, l.fullname, l.dept, l.is_admin, 'Edit', l.opened_at);
  }
  for (const v of storeAch.viewers[area] ?? []) add(v.user, v.fullname, v.dept, v.is_admin, 'View', v.since);
  return out.sort((a, b) => Number(b.me) - Number(a.me));
});
function stopViewing() {
  if (viewTimer) { clearInterval(viewTimer); viewTimer = null; }
  if (viewingArea) { storeAch.pingViewer(viewingArea, 'leave'); viewingArea = ''; }
}
onBeforeUnmount(stopViewing);

onMounted(() => {
  if (isModalViewOpen.value) {
    loadData();
    startViewing();
  }
});

const notif = useNotificationStore();
// Lock slot departemen saya yang dipegang orang lain (slot lain tidak memblokir)
const lockHolder = computed(() => {
  const l = storeAch.locks[selectedArea.value]; if (!l) return null;
  for (const sl of storeAch.mySlots) { const x = l[sl]; if (x && x.user !== authStore.user.username) return x; }
  return null;
});
const lockedByOther = computed(() => !!lockHolder.value);

const editData = async () => {
  const ok = await storeAch.openFormEditById(selectedArea.value);
  if (!ok) {
    notif.showDialogWarning('Form terkunci', currentUser.value.messages || 'Form sedang dibuka oleh user lain.');
    return;
  }
  storeAch.isModalViewOpen = false;
  storeAch.isModalEditOpen = true;
};

const closeModal = () => {
  storeAch.isModalViewOpen = false;
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isModalViewOpen"
        class="fixed inset-0 z-[3000] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm"
        @click.self="storeAch.isModalViewOpen = false"
      >
        <div class="bg-white rounded-lg shadow-lg w-11/12 h-[95vh] w-[98%] flex flex-col">
          <!-- Header Modal -->
          <div class="flex items-center justify-between pt-4 px-4 border-b">
            <div class="flex items-center gap-4 w-full flex-wrap">
              <h1 class="text-gray-800 text-xl font-semibold">Achievement Welding - Area {{ selectedArea }}</h1>
              <button
                @click="editData"
                class="flex items-center gap-2 text-white font-medium rounded-full text-sm px-3 py-1"
                :class="lockedByOther
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600'
                  : 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br'"
                :title="lockedByOther ? `Sedang diedit oleh ${lockHolder?.fullname || lockHolder?.user}` : 'Edit Data'"
              >
                <i :class="lockedByOther ? 'mdi mdi-lock' : 'mdi mdi-pencil'"></i>
                {{ lockedByOther ? `Dikunci: ${lockHolder?.user}` : 'Edit Data' }}
              </button>
              <OpSplitToggle />
              <!-- Presence: yang sedang membuka area ini (Edit 1 akun, View banyak) -->
              <div class="flex items-center gap-1.5 flex-wrap">
                <span
                  v-for="c in presenceChips"
                  :key="c.user"
                  class="inline-flex items-center gap-1.5 text-[11px] leading-none pl-1 pr-2 py-1 rounded-full border whitespace-nowrap"
                  :class="c.me ? 'bg-blue-50 text-blue-700 border-blue-200' : c.mode === 'Edit' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200'"
                  :title="`${c.me ? 'Anda' : c.name} — ${c.dept} · ${c.mode} · sejak ${c.since}`"
                >
                  <span
                    class="relative w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold text-white"
                    :class="c.me ? 'bg-blue-600' : c.mode === 'Edit' ? 'bg-amber-500' : 'bg-gray-400'"
                  >
                    {{ c.initials }}
                    <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white"></span>
                  </span>
                  <span class="font-semibold">{{ c.me ? 'Anda' : c.name }}</span>
                  <i v-if="c.isAdmin" class="mdi mdi-shield-crown text-amber-500"></i>
                  <span class="opacity-70">{{ c.dept }} · <i :class="c.mode === 'Edit' ? 'mdi mdi-pencil' : 'mdi mdi-eye'"></i> {{ c.mode }} · {{ c.since }}</span>
                </span>
              </div>
            </div>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <i class="mdi mdi-close text-2xl"></i>
            </button>
          </div>

          <!-- Body Modal -->
          <div class="px-4 pb-3 flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">

            <div class="shadow-md rounded-lg p-2 bg-white border flex flex-col" :class="showSummary ? '' : 'flex-1 min-h-0'">
              <div ref="wrapRef" class="relative pb-1 table-wrapper" :class="showSummary ? '' : 'flex-1 min-h-0'">
                <table class="ach-view-table w-full text-[13px] text-left text-gray-500 whitespace-nowrap">
                  <thead class="text-xs text-gray-700 bg-gray-50">
                    <tr>
                      <th colspan="10" class="px-1.5 py-1.5 text-center bg-blue-50">Plan</th>
                      <th colspan="13" class="px-1.5 py-1.5 text-center bg-green-50">Actual</th>
                    </tr>
                    <tr>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-blue-50">No</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-blue-50">Part Number</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-blue-50">Job Number</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-blue-50">Status</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-blue-50">Machine</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-blue-50">Stroke</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-blue-50">Lot Size</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-blue-50">TPT</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-blue-50">UPH</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-blue-50">Keterangan</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-green-50">Stroke</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-green-50">OK</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-green-50">Repair</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-green-50">Reject</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-green-50 leading-tight" title="Total Lot Size (OK + Repair)">Total<br />Lot</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-green-50" title="Idletime (menit)">Idle</th>
                      <th colspan="5" class="px-1.5 py-1.5 text-center bg-green-50">Down Time</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-green-50" title="TPT actual (menit)">TPT</th>
                      <th rowspan="2" class="px-1.5 py-1.5 text-center bg-green-50">UPH</th>
                    </tr>
                    <tr>
                      <th class="px-1.5 py-1.5 text-center bg-green-50" title="Down time mesin">Mesin</th>
                      <th class="px-1.5 py-1.5 text-center bg-green-50">Jig</th>
                      <th class="px-1.5 py-1.5 text-center bg-green-50">Other</th>
                      <th class="px-1.5 py-1.5 text-center bg-green-50">Bahan</th>
                      <th class="px-1.5 py-1.5 text-center bg-green-50">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="(item, localIndex) in paginatedData" :key="item.schedule_id || localIndex">
                    <!-- Mode OP Pisah: proses antara (read-only), baris part di bawah = OP terakhir -->
                    <template v-if="splitOp">
                      <tr v-for="o in midOps(item)" :key="o.op" class="op-sub text-center">
                        <td class="px-1.5 py-1.5"></td>
                        <td class="px-1.5 py-1.5">{{ item.part_number }}</td>
                        <td class="px-1.5 py-1.5">{{ item.job_number }}</td>
                        <td class="px-1.5 py-1.5">WIP</td>
                        <td class="px-1.5 py-1.5"><span class="op-badge">{{ o.op }}</span> {{ o.machine }}</td>
                        <td class="px-1.5 py-1.5">{{ o.stroke || '-' }}</td>
                        <td colspan="17" class="px-3 py-1.5 text-left op-sub-note">
                          ↳ proses antara{{ o.ct ? ` · CT ${o.ct} dtk` : '' }} — actual di {{ lastOp(item)?.op }}
                        </td>
                      </tr>
                    </template>
                    <tr class="row-main bg-white hover:bg-gray-50 text-center">
                      <td class="px-1.5 py-2">{{ getGlobalIndex(localIndex) + 1 }}</td>
                      <td class="px-1.5 py-2">{{ item.part_number }}</td>
                      <td class="px-1.5 py-2">{{ item.job_number }}</td>
                      <td class="px-1.5 py-2">{{ item.status_plan }}</td>
                      <td class="px-1.5 py-2 font-medium text-gray-700">
                        <template v-if="splitOp && lastOp(item)"><span class="op-badge">{{ lastOp(item)!.op }}</span> {{ lastOp(item)!.machine }}</template>
                        <template v-else>{{ item.mc_weld || '-' }}</template>
                      </td>
                      <td class="px-1.5 py-2">{{ item.stroke_plan }}</td>
                      <td class="px-1.5 py-2">{{ item.lotsize }}</td>
                      <td class="px-1.5 py-2">{{ item.tpt }}</td>
                      <td class="px-1.5 py-2">{{ item.uph_plan }}</td>
                      <td class="px-1.5 py-2">{{ item.keterangan_plan }}</td>
                      <td class="px-1.5 py-2">{{ item.stroke_act }}</td>
                      <td class="px-1.5 py-2">{{ item.lotsize_actual }}</td>
                      <td class="px-1.5 py-2">{{ item.repair }}</td>
                      <td class="px-1.5 py-2">{{ item.reject }}</td>
                      <td
                        class="px-1.5 py-2"
                        :class="
                          Number(item.total_lotsize_act) > Number(item.lotsize)
                            ? 'text-blue-500 font-medium'
                            : Number(item.total_lotsize_act) < Number(item.lotsize)
                              ? 'text-red-500 font-medium'
                              : ''
                        "
                      >
                        {{ item.total_lotsize_act }}
                      </td>
                      <td class="px-1.5 py-2">{{ item.idletime }}</td>
                      <td class="px-1.5 py-2">{{ item.dt_machines }}</td>
                      <td class="px-1.5 py-2">{{ item.dt_jig }}</td>
                      <td class="px-1.5 py-2">{{ item.dt_other }}</td>
                      <td class="px-1.5 py-2">{{ item.dt_wip }}</td>
                      <td class="px-1.5 py-2">{{ item.total_dt === 0 ? '' : item.total_dt }}</td>
                      <td class="px-1.5 py-2">{{ item.tpt_actual === '0.00' ? '-' : item.tpt_actual }}</td>
                      <td class="px-1.5 py-2">{{ item.uph ?? '-' }}</td>
                    </tr>
                    </template>
                  </tbody>
                </table>
              </div>

              <!-- Bottom Controls (Search & Pagination) -->
              <div class="flex flex-wrap gap-4 items-center justify-between mt-2">
                <!-- Showing Text -->
                <span class="text-sm text-gray-700">
                  Menampilkan {{ filteredData.length > 0 ? pageStart + 1 : 0 }} - {{ pageEnd }} dari {{ filteredData.length }} data
                </span>

                <div class="flex items-center gap-4">
                  <button
                    @click="showSummary = !showSummary"
                    class="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 font-medium transition"
                  >
                    <i :class="showSummary ? 'mdi mdi-eye' : 'mdi mdi-eye-off'" class="text-lg"></i>
                    {{ showSummary ? 'Sembunyikan Summary' : 'Summary & Attendance' }}
                  </button>
                  <!-- Search Bar -->
                  <div class="w-64 relative">
                    <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <i class="mdi mdi-magnify text-gray-500"></i>
                    </div>
                    <input
                      type="text"
                      v-model="searchQuery"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2"
                      placeholder="Cari Part Number / Job Number..."
                    />
                  </div>

                  <!-- Pagination Buttons -->
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


            <div v-show="showSummary" class="flex gap-3">
              <!-- Attandance -->
              <div class="relative overflow-x-auto shadow-md sm:rounded-lg w-1/2 border">
                <table class="w-full text-sm text-left text-gray-500">
                  <thead class="text-xs text-gray-700 bg-gray-50">
                    <tr>
                      <th colspan="5" class="px-2 py-1.5 text-center text-lg">Σ Man Power</th>
                    </tr>
                    <tr>
                      <th class="px-2 py-1.5 text-center"></th>
                      <th class="px-2 py-1.5 text-center bg-blue-50">Standard</th>
                      <th class="px-2 py-1.5 text-center bg-green-50">Actual</th>
                      <th class="px-2 py-1.5 text-center bg-yellow-50">Sakit</th>
                      <th class="px-2 py-1.5 text-center bg-gray-100">Izin</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="role in ['Foreman', 'Checkman', 'Handling', 'Operator']" :key="role" class="bg-white hover:bg-gray-50">
                      <td class="px-2 py-1.5 text-center">{{ role }}</td>
                      <template v-for="att in attendance" :key="att.name_role">
                        <template v-if="att.name_role === role">
                          <td class="px-2 py-1.5 text-center">{{ att.standard ?? '-' }}</td>
                          <td class="px-2 py-1.5 text-center">{{ att.present ?? '-' }}</td>
                          <td class="px-2 py-1.5 text-center">{{ att.sick ?? '-' }}</td>
                          <td class="px-2 py-1.5 text-center">{{ att.leave ?? '-' }}</td>
                        </template>
                      </template>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Summary Table -->
              <div class="relative overflow-x-auto shadow-md sm:rounded-lg w-full border">
                <table class="w-full h-full text-sm text-left text-gray-500">
                  <thead class="text-xs text-gray-700 bg-gray-50">
                    <tr>
                      <th colspan="6" class="px-2 py-1.5 text-center">TOTAL QTY</th>
                      <th rowspan="2" class="px-2 py-1.5 text-center text-lg">STROKE</th>
                      <th rowspan="2" class="px-2 py-1.5 text-center text-lg">UPH</th>
                      <th rowspan="2" class="px-2 py-1.5 text-center text-lg">TPT</th>
                    </tr>
                    <tr>
                      <th colspan="2" class="px-2 py-1.5 text-center bg-green-50">OK</th>
                      <th colspan="2" class="px-2 py-1.5 text-center bg-yellow-50">Repair</th>
                      <th colspan="2" class="px-2 py-1.5 text-center bg-red-50">Reject</th>
                    </tr>
                    <tr>
                      <th class="px-2 py-2 text-center bg-green-50">PCS</th>
                      <th class="px-2 py-2 text-center bg-green-50">%</th>
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
                      <td class="px-2 py-4 text-center bg-green-50 whitespace-nowrap text-4xl">{{ summaryData?.qty_total }}</td>
                      <td class="px-2 py-4 text-center bg-green-50 whitespace-nowrap text-4xl">
                        {{ utils.formatPercentOneZero(summaryData?.qty_persen) }}%
                      </td>
                      <td class="px-2 py-4 text-center bg-yellow-50 whitespace-nowrap text-4xl">{{ summaryData?.repair_total }}</td>
                      <td class="px-2 py-4 text-center bg-yellow-50 whitespace-nowrap text-4xl">
                        {{ utils.formatPercentOneZero(summaryData?.repair_persen) }}%
                      </td>
                      <td class="px-2 py-4 text-center bg-red-50 whitespace-nowrap text-4xl">{{ summaryData?.reject_total }}</td>
                      <td class="px-2 py-4 text-center bg-red-50 whitespace-nowrap text-4xl">
                        {{ utils.formatPercentOneZero(summaryData?.reject_persen) }}%
                      </td>
                      <td class="px-2 py-4 text-center whitespace-nowrap text-4xl">
                        {{ utils.formatDecimaltoNumber(summaryData?.total_stroke_actual) }}
                      </td>
                      <td class="px-2 py-4 text-center whitespace-nowrap text-4xl">
                        {{ utils.formatDecimaltoNumber(summaryData?.avg_uph) }}
                      </td>
                      <td class="px-2 py-4 text-center whitespace-nowrap text-4xl">
                        {{ utils.formatDecimaltoNumber(summaryData?.tpt_total) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="flex justify-center"></div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
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
  background-clip: padding-box;
}
thead tr:nth-child(2) th {
  top: 30px;
}
thead tr:nth-child(3) th {
  top: 58.5px;
}
thead th,
tbody td {
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}
thead th:first-child,
tbody td:first-child {
  border-left: 1px solid #e5e7eb;
}
thead tr:first-child th {
  border-top: 1px solid #e5e7eb;
}
.op-sub td { background: #f8fafc; color: #64748b; font-size: 11px; border-bottom: 1px dashed #e2e8f0; }
.op-sub-note { font-style: italic; color: #94a3b8; }
.op-badge {
  display: inline-block; padding: 1px 6px; margin-right: 2px; border-radius: 999px;
  background: #eef2ff; color: #4338ca; font-size: 10px; font-weight: 700; letter-spacing: 0.02em;
}
</style>
