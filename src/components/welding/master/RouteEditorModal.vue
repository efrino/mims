<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { vModalStack } from '@/directives/modalStack';
import masterService from '@/services/Public/Welding/masterService';
import machineMasterService, { type MachineTreeGroup } from '@/services/Public/Welding/machineMasterService';
import { useNotificationStore } from '@/stores/notification';

interface PartRef {
  part_number: string;
  part_number_delivery?: string | null;
  area?: string | null;
  is_wip?: number | string | null;
}
interface Proc { machine: string; uph: number | string; stroke_mili_spot: number | string; }

const props = defineProps<{ modelValue: boolean; part: PartRef | null }>();
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; saved: [] }>();

const notif = useNotificationStore();
const rows = ref<Proc[]>([]);
const loading = ref(false);
const saving = ref(false);

const isWip = computed(() => String(props.part?.is_wip ?? '0') === '1');
const routeKey = computed(() =>
  isWip.value ? (props.part?.part_number || '') : (props.part?.part_number_delivery || props.part?.part_number || '')
);
const area = computed(() => props.part?.area || '');
// IFPP (area INHOUSE/OUTHOUSE) memakai "Line" (A/B/C/.../300T) sbg pengganti "Machine".
const isLine = computed(() => ['INHOUSE', 'OUTHOUSE'].includes((props.part?.area || '').toUpperCase()));
const procLabel = computed(() => (isLine.value ? 'Line' : 'Machine'));
const LINE_OPTIONS = ['BL', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'SP', '300T'];

const blank = (): Proc => ({ machine: '', uph: '', stroke_mili_spot: '' });

// Pilihan mesin BERTINGKAT (Grup → No) dari Master Mesin — bukan teks bebas lagi.
// Teks bebas dulu = sumber kode kotor ('E1,', '(ABB-1)', 'H1-H2-H3'). Area
// INHOUSE/OUTHOUSE (line) memakai master area INHOUSE. Kode yg tersimpan tapi
// tidak ada di master tetap ditampilkan sbg opsi '(tidak terdaftar)' supaya
// routing lama tetap bisa dibuka & disimpan tanpa kehilangan nilai.
const machineGroups = ref<MachineTreeGroup[]>([]);
const machineCodes = computed(() => new Set(machineGroups.value.flatMap(g => g.machines.map(m => m.machine))));
async function loadMachineGroups() {
  machineGroups.value = [];
  const a = isLine.value ? 'INHOUSE' : area.value;
  if (!a) return;
  try {
    const res = await machineMasterService.tree(true);
    for (const p of res.data ?? []) for (const ar of p.areas) if (ar.area === a) machineGroups.value = ar.groups;
  } catch { machineGroups.value = []; }
}

watch(() => props.modelValue, async (open) => {
  if (!open || !props.part) return;
  loading.value = true;
  void loadMachineGroups();
  try {
    const data = await masterService.getRoute(routeKey.value, area.value, props.part.part_number);
    rows.value = data.length
      ? data.map((d: any) => ({ machine: d.machine ?? '', uph: d.uph ?? '', stroke_mili_spot: d.stroke_mili_spot ?? '' }))
      : [blank()];
  } catch (e) {
    rows.value = [blank()];
  } finally {
    loading.value = false;
  }
});

// Total proses → tambah/kurang baris
const setTotal = (n: number) => {
  n = Math.max(1, Math.min(12, Math.floor(n) || 1));
  while (rows.value.length < n) rows.value.push(blank());
  while (rows.value.length > n) rows.value.pop();
};
const addRow = () => rows.value.push(blank());
const removeRow = (i: number) => { rows.value.splice(i, 1); if (!rows.value.length) rows.value.push(blank()); };

const close = () => emit('update:modelValue', false);

const save = async () => {
  const processes = rows.value.filter((r) => String(r.machine).trim() !== '');
  if (!processes.length) { notif.showDialogWarning('Warning', `Minimal 1 ${procLabel.value.toLowerCase()} diisi.`); return; }
  saving.value = true;
  try {
    const ok = await masterService.saveRoute({
      route_key: routeKey.value, area: area.value,
      ms_part: props.part?.part_number || routeKey.value, processes,
    });
    if (ok) { notif.showAlertSuccess('Routing tersimpan ke master.'); emit('saved'); close(); }
    else notif.showDialogWarning('Warning', 'Gagal menyimpan routing.');
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" v-modal-stack="close" class="fixed inset-0 z-[4000] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm" @click.self.prevent>
        <div class="bg-white rounded-xl shadow-2xl w-[95%] max-w-2xl max-h-[88vh] flex flex-col">
          <div class="flex items-center justify-between px-5 py-3 border-b">
            <div class="min-w-0">
              <h2 class="text-gray-800 text-lg font-semibold truncate">
                <i class="mdi mdi-robot-industrial-outline text-indigo-600"></i> Routing Proses <span class="text-sm font-normal text-gray-400">({{ procLabel }})</span>
              </h2>
              <p class="text-xs text-gray-500 truncate">
                {{ routeKey }} <span v-if="area">· {{ area }}</span> · {{ isWip ? 'WIP' : 'FP' }}
              </p>
            </div>
            <button @click="close" class="text-gray-400 hover:text-gray-600"><i class="mdi mdi-close text-2xl"></i></button>
          </div>

          <div class="px-5 py-3 overflow-y-auto flex flex-col gap-3">
            <p class="text-xs text-gray-500">
              <template v-if="isLine">
                Tiap proses = 1 line (urut, mis. A→B→C). UPH & Stroke per line. Total proses = jumlah baris.
              </template>
              <template v-else>
                Tiap proses = 1 mesin (urut A1→A2→…). UPH & Stroke per mesin. Total proses = jumlah baris.
              </template>
            </p>
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-gray-600">Total Proses</label>
              <input type="number" min="1" max="12" :value="rows.length"
                @input="setTotal(Number(($event.target as HTMLInputElement).value))"
                class="w-20 px-2 py-1.5 border-2 border-indigo-300 rounded text-sm" />
              <span v-if="loading" class="text-xs text-indigo-500"><i class="mdi mdi-loading mdi-spin"></i> memuat…</span>
            </div>

            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-gray-600 text-xs">
                <tr>
                  <th class="px-2 py-1.5 text-left w-12">Seq</th>
                  <th class="px-2 py-1.5 text-left">{{ procLabel }}</th>
                  <th class="px-2 py-1.5 text-left">UPH</th>
                  <th class="px-2 py-1.5 text-left">Stroke (nut/spot)</th>
                  <th class="px-2 py-1.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in rows" :key="i" class="border-b">
                  <td class="px-2 py-1.5 text-gray-500">{{ i + 1 }}</td>
                  <td class="px-2 py-1.5">
                    <select v-if="machineGroups.length" v-model="r.machine" class="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white" :class="{ 'border-amber-400 bg-amber-50': r.machine && !machineCodes.has(r.machine) }">
                      <option value="">— pilih {{ procLabel.toLowerCase() }} —</option>
                      <option v-if="r.machine && !machineCodes.has(r.machine)" :value="r.machine">{{ r.machine }} (tidak terdaftar di Master Mesin)</option>
                      <optgroup v-for="g in machineGroups" :key="g.group" :label="g.group === '-' ? '(tanpa grup)' : g.group">
                        <option v-for="m in g.machines" :key="m.id" :value="m.machine">{{ m.machine }}<template v-if="m.machine_name"> · {{ m.machine_name }}</template></option>
                      </optgroup>
                    </select>
                    <input v-else v-model="r.machine" type="text" :list="isLine ? 'dl-route-line' : undefined" :placeholder="isLine ? 'A' : 'A1'" class="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                  </td>
                  <td class="px-2 py-1.5"><input v-model="r.uph" type="number" class="w-full px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                  <td class="px-2 py-1.5"><input v-model="r.stroke_mili_spot" type="number" class="w-full px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                  <td class="px-2 py-1.5 text-center"><button @click="removeRow(i)" class="text-red-500 hover:text-red-700"><i class="mdi mdi-delete"></i></button></td>
                </tr>
              </tbody>
            </table>
            <button @click="addRow" class="self-start flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              <i class="mdi mdi-plus-circle"></i> Tambah proses
            </button>
            <datalist id="dl-route-line">
              <option v-for="opt in LINE_OPTIONS" :key="opt" :value="opt" />
            </datalist>
          </div>

          <div class="flex justify-end gap-3 px-5 py-3 border-t">
            <button @click="close" class="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">Batal</button>
            <button @click="save" :disabled="saving"
              :class="saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'"
              class="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white font-medium flex items-center gap-1">
              <i :class="saving ? 'mdi mdi-loading mdi-spin' : 'mdi mdi-content-save'"></i> Simpan
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
