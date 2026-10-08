import { ref, reactive, computed } from 'vue';
import { useWipStore } from '@/stores/Public/Welding/WipStore';
import type { StockFilter, TrxFilter, WipGeneratePayload, WipTrxRow } from '@/types/Public/Welding/Wip';

export function useWipManagement() {
  const store = useWipStore();
  const activeTab = ref<'stock' | 'trx'>('stock');
  const activeArea = ref('');
  const stockFilter = reactive<StockFilter>({ part_number: '', job_number: '', source: '' });
  const trxFilter = reactive<TrxFilter>({ trx_date: '', shift: '', status: '', type: '' });
  const showDetail = ref(false);
  const showGenerate = ref(false);
  const showEditTrx = ref(false);
  const editTrxRow = ref<WipTrxRow | null>(null);
  const generating = ref(false);
  const genError = ref('');

  const todayLabel = computed(() =>
    new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  );
  const lastSyncLabel = computed(() => store.lastSync ? fmtDate(store.lastSync) : '-');

  function fetchStock() {
    const f: StockFilter = { ...stockFilter };
    if (activeArea.value) f.area_code = activeArea.value;
    store.fetchStock(f);
  }
  function fetchTrx() {
    const f: TrxFilter = { ...trxFilter };
    if (activeArea.value) f.area_code = activeArea.value;
    store.fetchTrxList(f);
  }
  function toggleArea(area: string) {
    activeArea.value = activeArea.value === area ? '' : area;
    fetchStock(); fetchTrx();
  }
  async function openDetail(id: number) {
    await store.fetchTrxDetail(id);
    showDetail.value = true;
  }
  function openGenerate() { genError.value = ''; showGenerate.value = true; }
  function openEditTrx(row: WipTrxRow) { editTrxRow.value = row; genError.value = ''; showEditTrx.value = true; }

  async function doGenerate(payload?: WipGeneratePayload) {
    genError.value = '';
    const data = payload ?? { trx_date: '', shift: 'Day' as const, area_code: '', fp_part_number: '', fp_qty_plan: 0 };
    if (!data.area_code || !data.fp_part_number || data.fp_qty_plan <= 0) {
      genError.value = 'Semua field wajib diisi dan qty > 0'; return;
    }
    generating.value = true;
    const res = await store.generateReceipt(data);
    if (res) {
      showGenerate.value = false; showEditTrx.value = false;
      editTrxRow.value = null; activeTab.value = 'trx'; fetchTrx();
    } else { genError.value = 'Gagal generate struk'; }
    generating.value = false;
  }

  async function deleteTrx(id: number) { await store.deleteTrx(id); fetchTrx(); }
  async function confirmTrx(id: number) { await store.confirmTrx(id); fetchTrx(); }
  async function doSync() { await store.sync(); fetchStock(); fetchTrx(); }

  async function init() {
    await store.fetchSummaryAndAreas();
    await Promise.all([fetchStock(), fetchTrx()]);
  }

  function fmtNum(v: number | null | undefined): string {
    if (v == null) return '-'; return Number(v).toLocaleString('id-ID');
  }
  function fmtDate(v: string | null | undefined): string {
    if (!v) return '-';
    return new Date(v).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return {
    store, activeTab, activeArea, stockFilter, trxFilter,
    showDetail, showGenerate, showEditTrx, editTrxRow,
    generating, genError, todayLabel, lastSyncLabel,
    init, fetchStock, fetchTrx, toggleArea,
    openDetail, openGenerate, openEditTrx,
    doGenerate, confirmTrx, deleteTrx, doSync,
    fmtNum, fmtDate,
  };
}