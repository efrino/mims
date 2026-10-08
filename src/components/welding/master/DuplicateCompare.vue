<!-- components/welding/master/DuplicateCompare.vue
  Perbandingan baris bernomor part SAMA di area berbeda (dari Children by SAP →
  same_pn_other_area + holder_compare). Tampil berdampingan supaya user bisa langsung
  memilih baris mana yang dinonaktifkan (runout, bisa dibatalkan) — bukan cuma info ID.
  Area IFPD ikut dibandingkan; baris yg PERNAH delivery (DN 12 bln > 0) ditandai merah &
  konfirmasi nonaktifnya lebih tegas — perlu pertimbangan kuat. -->
<template>
  <section class="dc">
    <p class="dc-title">
      <i class="mdi mdi-content-duplicate"></i>
      {{ partNumber }} ada di {{ rows.length }} area — pilih yang dinonaktifkan kalau duplikat
    </p>
    <div class="dc-scroll">
      <table class="dc-table">
        <thead>
          <tr>
            <th></th>
            <th v-for="r in rows" :key="r.id" :class="{ 'dc-self': r.id === holderId }">
              {{ r.area }}
              <span v-if="r.id === holderId" class="dc-self-tag">baris ini</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in FIELDS" :key="f.key">
            <td class="dc-label">{{ f.label }}</td>
            <td v-for="r in rows" :key="r.id" :class="{ 'dc-diff': differs(f.key), 'dc-self': r.id === holderId, 'dc-dn': f.key === 'dn_12bln' && delivered(r) }">
              {{ f.key === 'dn_12bln' ? Number(r.dn_12bln ?? 0).toLocaleString('id-ID') : show(r, f.key) }}
              <span v-if="f.key === 'dn_12bln' && delivered(r)" class="dc-dn-tag">pernah dikirim</span>
            </td>
          </tr>
          <tr>
            <td></td>
            <td v-for="r in rows" :key="r.id" :class="{ 'dc-self': r.id === holderId }">
              <div class="dc-actions">
              <span v-if="Number(r.is_runout)" class="dc-off"><i class="mdi mdi-check-circle-outline"></i> Sudah nonaktif</span>
              <button v-else type="button" class="dc-btn" :disabled="busyId !== null" @click="deactivate(r)">
                <i class="mdi" :class="busyId === r.id ? 'mdi-loading mdi-spin' : 'mdi-archive-arrow-down-outline'"></i>
                Nonaktifkan
              </button>
              <!-- Serah terima: relasi, varian, media (& mutasi bila bisa) dari baris ini ke baris aktif lain -->
              <button v-for="t in handoverTargets(r)" :key="t.id" type="button" class="dc-btn dc-btn--handover" :disabled="busyId !== null"
                      :title="`Pindahkan relasi, varian & media dari ${r.area} ke ${t.area}`" @click="handover(r, t)">
                <i class="mdi" :class="busyId === 'ho' + r.id ? 'mdi-loading mdi-spin' : 'mdi-transfer-right'"></i> Serahkan ke {{ t.area }}
              </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- WIP (dirakit ke mother) + FP (kirim langsung) untuk part yang sama = part COMMON. -->
    <div v-if="commonPair" class="dc-common">
      <p>
        <i class="mdi mdi-call-split"></i>
        Ada baris <b>WIP</b> ({{ commonPair.wip.area }}, {{ commonPair.wip.mothers }} mother) dan <b>FP</b> ({{ commonPair.fp.area }}, customer {{ commonPair.fp.customer_1 || '—' }}).
        Kalau part ini dirakit <i>dan</i> dikirim langsung, jadikan COMMON — tidak perlu menonaktifkan apa pun.
      </p>
      <button type="button" class="dc-btn dc-btn--common" :disabled="busyId !== null" @click="makeCommon">
        <i class="mdi" :class="busyId === 'common' ? 'mdi-loading mdi-spin' : 'mdi-call-split'"></i> Jadikan COMMON (WIP + FP)
      </button>
    </div>
    <div v-if="areaKey" class="dc-ok">
      <span>Bukan duplikat? (mis. jalur/area berbeda yang memang sah)</span>
      <button type="button" class="dc-btn dc-btn--ok" :disabled="busyId !== null" @click="markOk">
        <i class="mdi" :class="busyId === 'ok' ? 'mdi-loading mdi-spin' : 'mdi-shield-check-outline'"></i> Semua aman — bukan duplikat
      </button>
    </div>
    <p class="dc-hint">Kolom kuning = nilai berbeda. Merah = pernah delivery (pertimbangkan kuat). Nonaktifkan = runout (bisa diaktifkan lagi lewat filter Nonaktif). Pertahankan baris yang punya relasi, mutasi, atau delivery.</p>
  </section>
</template>

<script setup lang="ts">
import { alertDialog, confirmDialog } from '@/utils/dialog';
import { computed, ref } from 'vue';
import masterService from '@/services/Public/Welding/masterService';

export interface DupRow {
  id: number | string; area: string | null; status_part: string | null; op: string | number | null;
  machine: string | null; qty_kbn: string | number | null; customer_1: string | null; model: string | null;
  job_number: string | null; children: string | number; mothers: string | number; mutasi_bulan_ini: string | number;
  last_user_updated: string | null; updated_at: string | null;
  delivery_variants?: number; dn_12bln?: number; is_runout?: number | string;
}

const props = defineProps<{ partNumber: string; holder: DupRow | null; others: DupRow[]; areaKey?: string | null }>();
// holderGone = baris yang sedang dibuka ("baris ini") ikut dinonaktifkan → modal induk tutup.
const emit = defineEmits<{ changed: [holderGone: boolean] }>();

const FIELDS: { key: keyof DupRow; label: string }[] = [
  { key: 'status_part', label: 'Status' },
  { key: 'op', label: 'OP' },
  { key: 'machine', label: 'Mesin' },
  { key: 'qty_kbn', label: 'Qty KBN' },
  { key: 'job_number', label: 'Job' },
  { key: 'customer_1', label: 'Customer' },
  { key: 'model', label: 'Model' },
  { key: 'mothers', label: 'Mother aktif' },
  { key: 'children', label: 'Komponen' },
  { key: 'mutasi_bulan_ini', label: 'Mutasi bulan ini' },
  { key: 'delivery_variants', label: 'Varian delivery' },
  { key: 'dn_12bln', label: 'DN 12 bulan (pcs)' },
  { key: 'last_user_updated', label: 'Diubah oleh' },
  { key: 'updated_at', label: 'Diubah' },
];

const rows = computed(() => [...(props.holder ? [props.holder] : []), ...props.others]);
const holderId = computed(() => props.holder?.id);
const show = (r: DupRow, k: keyof DupRow) => (r[k] === null || r[k] === '' ? '—' : String(r[k]));
const differs = (k: keyof DupRow) => new Set(rows.value.map(r => show(r, k))).size > 1;

const delivered = (r: DupRow) => Number(r.dn_12bln ?? 0) > 0;

// "Semua aman": simpan kombinasi area ini sbg bukan duplikat → peringatan tak muncul lagi.
async function markOk() {
  if (!props.areaKey) return;
  if (!await confirmDialog(`Tandai ${props.partNumber} di ${props.areaKey.split('|').join(', ')} sebagai BUKAN duplikat? Peringatan tidak muncul lagi (muncul lagi kalau ada baris di area lain).`, { title: 'Semua aman', confirmText: 'Tandai aman', danger: false })) return;
  busyId.value = 'ok';
  try {
    const res = await masterService.setDupOk(props.partNumber, props.areaKey, true);
    if (!res.success) { alertDialog(res.message); return; }
    emit('changed', false);
  } catch (e: any) {
    alertDialog(e?.response?.data?.message ?? 'Gagal menandai aman.');
  } finally {
    busyId.value = null;
  }
}
const active = (r: DupRow) => !Number(r.is_runout);
const handoverTargets = (r: DupRow) => rows.value.filter(t => t.id !== r.id && active(t));

// Serah terima data baris lama → baru: pratinjau → konfirmasi → (mutasi?) → terapkan → tawarkan nonaktif.
async function handover(from: DupRow, to: DupRow) {
  busyId.value = 'ho' + from.id;
  try {
    const pv = await masterService.handover(Number(from.id), Number(to.id));
    if (!pv.success || !pv.preview) { alertDialog(pv.message ?? 'Gagal membuat pratinjau.'); return; }
    const p = pv.preview;
    const list = (xs: { label: string }[]) => (xs.length ? xs.map(x => '  • ' + x.label).join('\n') : '  —');
    const nothing = !p.mothers.length && !p.children.length && !p.variants.length && !p.media;
    const msg = `Serah terima ${p.from} → ${p.to}

Mother (${p.mothers.length}):
${list(p.mothers)}

Komponen (${p.children.length}):
${list(p.children)}

`
      + `Varian delivery: ${p.variants.length} · Media: ${p.media}
`
      + (p.mutasi.possible ? `Mutasi: ${p.mutasi.move} baris bisa dipindah, ${p.mutasi.conflict} tanggal bentrok (tetap di area lama, tidak hilang).` : 'Mutasi: tidak dipindah (part number beda).');
    if (nothing && !p.mutasi.move) { alertDialog(msg + '\n\nTidak ada data yang perlu dipindah.', { title: 'Serah terima' }); return; }
    if (!await confirmDialog(msg, { title: 'Serah terima data', confirmText: 'Serahkan', danger: false })) return;
    const withMut = p.mutasi.move > 0
      && await confirmDialog(`Pindahkan juga ${p.mutasi.move} baris mutasi dari ${from.area} ke ${to.area}? Tanggal yang bentrok tidak disentuh.`, { title: 'Mutasi', confirmText: 'Pindahkan', cancelText: 'Jangan' });
    const res = await masterService.handover(Number(from.id), Number(to.id), true, withMut);
    if (!res.success) { alertDialog(res.message ?? 'Serah terima gagal.'); return; }
    let holderGone = false;
    if (active(from) && await confirmDialog(`Serah terima selesai${res.mutasi_moved ? ` (${res.mutasi_moved} baris mutasi dipindah)` : ''}. Nonaktifkan ${props.partNumber} di ${from.area} sekarang?`, { title: 'Selesai', confirmText: 'Nonaktifkan', cancelText: 'Nanti' })) {
      const d = await masterService.softDelete(Number(from.id));
      if (!d.success) alertDialog(d.message);
      holderGone = d.success && from.id === holderId.value;
    }
    emit('changed', holderGone);
  } catch (e: any) {
    alertDialog(e?.response?.data?.message ?? 'Serah terima gagal.');
  } finally {
    busyId.value = null;
  }
}

// Pasangan WIP (punya mother) + FP → kandidat part COMMON.
const commonPair = computed(() => {
  const wip = rows.value.find(r => r.status_part === 'WIP' && Number(r.mothers) > 0);
  const fp = rows.value.find(r => r.status_part === 'FP');
  return wip && fp ? { wip, fp } : null;
});
// Baris WIP jadi COMMON: jalur WIP tetap ikut mother; customer jalur FP (kirim langsung)
// diambil dari baris FP. Baris FP (mis. IFPD) dipertahankan sbg stok delivery.
async function makeCommon() {
  const p = commonPair.value;
  if (!p) return;
  const cust = p.fp.customer_1 || null;
  if (!await confirmDialog(`Jadikan ${props.partNumber} di ${p.wip.area} sebagai COMMON?

• Jalur WIP: dirakit ke ${p.wip.mothers} mother (customer ikut mother)
• Jalur FP: kirim langsung ke ${cust ?? '—'} (dari baris ${p.fp.area})
• Baris ${p.fp.area} tetap aktif sebagai stok delivery.`)) return;
  busyId.value = 'common';
  try {
    const res = await masterService.update(Number(p.wip.id), {
      is_common: true, is_wip: true, status_part: 'WIP',
      ...(cust ? { customer_1: cust } : {}),
    });
    if (!res.success) { alertDialog(res.message); return; }
    emit('changed', false);
  } catch (e: any) {
    alertDialog(e?.response?.data?.message ?? 'Gagal menjadikan COMMON.');
  } finally {
    busyId.value = null;
  }
}

const busyId = ref<number | string | null>(null);
async function deactivate(r: DupRow) {
  const base = `Nonaktifkan ${props.partNumber} di ${r.area} (#${r.id})? Baris jadi runout — bisa diaktifkan lagi.`;
  const warn = delivered(r)
    ? `

⚠ BARIS INI PERNAH DELIVERY: ${Number(r.dn_12bln).toLocaleString('id-ID')} pcs dalam 12 bulan (${r.delivery_variants ?? 0} varian delivery). Pastikan delivery-nya sudah pindah ke baris lain sebelum menonaktifkan.`
    : '';
  if (!await confirmDialog(base + warn)) return;
  busyId.value = r.id;
  try {
    const res = await masterService.softDelete(Number(r.id));
    if (!res.success) { alertDialog(res.message); return; }
    emit('changed', r.id === holderId.value);
  } catch (e: any) {
    alertDialog(e?.response?.data?.message ?? 'Gagal menonaktifkan.');
  } finally {
    busyId.value = null;
  }
}
</script>

<style scoped>
.dc { border: 1px solid var(--dm-bd-amber, #fde68a); background: var(--dm-tint-amber, #fffbeb); border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; }
.dc-title { margin: 0 0 8px; font-size: 12.5px; font-weight: 700; color: var(--dm-on-amber, #92400e); display: flex; gap: 6px; align-items: center; }
.dc-scroll { overflow-x: auto; }
.dc-table { width: 100%; border-collapse: collapse; font-size: 12px; background: var(--dm-surface, #fff); border-radius: 8px; overflow: hidden; }
.dc-table th { text-align: left; padding: 6px 8px; background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #78350f); font-size: 11.5px; white-space: nowrap; }
.dc-table td { padding: 5px 8px; border-top: 1px solid var(--dm-bd-amber, #fef3c7); color: var(--dm-text, #1e293b); white-space: nowrap; }
.dc-label { color: var(--dm-muted, #64748b); font-size: 11.5px; }
.dc-diff { background: var(--dm-tint-amber, #fef9c3); font-weight: 600; }
.dc-self { background-color: var(--dm-tint-blue, #eff6ff); }
.dc-diff.dc-self { background: var(--dm-tint-amber, #fef9c3); }
.dc-self-tag { margin-left: 4px; font-size: 10px; font-weight: 700; color: var(--dm-accent, #1d4ed8); background: var(--dm-tint-blue, #dbeafe); border-radius: 999px; padding: 1px 6px; }
.dc-btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 7px; border: 1px solid var(--dm-bd-red, #fecaca); background: var(--dm-tint-red, #fef2f2); color: var(--dm-on-red, #b91c1c); font-size: 11.5px; font-weight: 600; cursor: pointer; }
.dc-btn:hover:not(:disabled) { background: var(--dm-tint-red, #fee2e2); }
.dc-btn:disabled { opacity: .5; cursor: wait; }
.dc-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.dc-btn--handover { border-color: var(--dm-bd-blue, #bfdbfe); background: var(--dm-tint-blue, #eff6ff); color: var(--dm-accent, #1d4ed8); }
.dc-btn--handover:hover:not(:disabled) { background: var(--dm-tint-blue, #dbeafe); }
.dc-ok { margin-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; font-size: 12px; color: var(--dm-text-2, #475569); background: var(--dm-surface2, #f8fafc); border: 1px solid var(--dm-border, #e2e8f0); border-radius: 8px; padding: 8px 10px; }
.dc-btn--ok { border-color: var(--dm-bd-green, #bbf7d0); background: var(--dm-tint-green, #f0fdf4); color: var(--dm-on-green, #15803d); }
.dc-btn--ok:hover:not(:disabled) { background: var(--dm-tint-green, #dcfce7); }
.dc-off { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; color: var(--dm-muted, #64748b); }
.dc-hint { margin: 6px 0 0; font-size: 11px; color: var(--dm-on-amber, #92400e); }
.dc-dn { color: var(--dm-on-red, #b91c1c); font-weight: 700; }
.dc-common { margin-top: 10px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: space-between; background: var(--dm-tint-green, #ecfdf5); border: 1px solid var(--dm-bd-green, #a7f3d0); border-radius: 8px; padding: 8px 10px; }
.dc-common p { margin: 0; font-size: 12px; color: var(--dm-on-green, #065f46); flex: 1; min-width: 240px; }
.dc-btn--common { border-color: #6ee7b7; background: var(--dm-tint-green, #d1fae5); color: var(--dm-on-green, #047857); }
.dc-btn--common:hover:not(:disabled) { background: var(--dm-tint-green, #a7f3d0); }
.dc-dn-tag { margin-left: 4px; font-size: 10px; font-weight: 700; color: #fff; background: #dc2626; border-radius: 999px; padding: 1px 6px; }
</style>
