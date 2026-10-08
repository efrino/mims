<!-- components/welding/master/ParentMixPicker.vue
     Smart picker untuk parent_part_mix:
       • typeahead + rekomendasi parent ter-rangking (skor + alasan)
       • preview rantai: parent → part ini → child
       • cek konektivitas (putus?) + tombol auto-link WIP child terdekat
-->
<template>
  <div class="pmp">
    <!-- Input + dropdown rekomendasi -->
    <div class="pmp-field" ref="rootRef">
      <div class="pmp-input-wrap">
        <i class="mdi mdi-sitemap pmp-lead-icon" />
        <input
          ref="inputRef"
          :value="query"
          type="text"
          class="pmp-input"
          :placeholder="placeholder"
          @input="onInput"
          @focus="open = true"
        />
        <button v-if="query" type="button" class="pmp-clear" title="Kosongkan (jadikan root)" @click="clearValue">
          <i class="mdi mdi-close" />
        </button>
      </div>

      <div v-if="open" class="pmp-dropdown" @mousedown.prevent>
        <div v-if="loading" class="pmp-empty"><i class="mdi mdi-loading mdi-spin" /> Mencari rekomendasi…</div>
        <template v-else>
          <div v-if="parents.length" class="pmp-list">
            <button
              v-for="p in parents"
              :key="p.id ?? p.part_number_mix"
              type="button"
              class="pmp-item"
              :class="{ 'pmp-item--current': p.is_current_parent, 'pmp-item--linked': isLinked(p) || p.is_runout }"
              :disabled="isLinked(p) || !!p.is_runout"
              :title="isLinked(p) ? 'Sudah terpasang sebagai mother part ini' : p.is_runout ? 'Part ini NONAKTIF (runout) — aktifkan dulu di tabel (filter Nonaktif) baru bisa dipilih' : undefined"
              @click="choose(p)"
            >
              <div class="pmp-item-main">
                <span class="pmp-type" :class="p.is_wip ? 'is-wip' : 'is-fp'">{{ p.is_wip ? 'WIP' : 'FP' }}</span>
                <span class="pmp-mix font-mono">{{ p.part_number_mix }}</span>
                <span v-if="p.op" class="pmp-op">OP{{ p.op }}</span>
                <span v-if="p.area" class="pmp-area">{{ p.area }}</span>
                <span v-if="isLinked(p)" class="pmp-linked"><i class="mdi mdi-check" /> sudah terpasang</span>
                <span v-if="p.is_runout" class="pmp-runout"><i class="mdi mdi-power-off" /> nonaktif</span>
              </div>
              <div class="pmp-item-sub">
                <span class="pmp-pn">{{ p.part_number }}</span>
                <span v-if="p.model" class="pmp-dim">· {{ p.model }}</span>
                <span v-if="(p as any).part_name" class="pmp-dim">· {{ (p as any).part_name }}</span>
              </div>
              <div v-if="(p.reasons ?? []).length" class="pmp-reasons">
                <span v-for="r in (p.reasons ?? [])" :key="r" class="pmp-tag">{{ r }}</span>
              </div>
            </button>
          </div>
          <div v-else class="pmp-empty">
            {{ query.length ? 'Tidak ada kandidat cocok — ketik untuk cari manual.' : 'Ketik / pilih dari rekomendasi.' }}
          </div>
        </template>
      </div>
    </div>

    <!-- Preview rantai + konektivitas -->
    <div v-if="result && !hidePreview" class="pmp-preview" :class="`pmp-preview--${result.connectivity.status}`">
      <div class="pmp-chain">
        <span class="pmp-chain-node pmp-chain-parent" :class="{ 'is-missing': modelValue && !result.current_parent }">
          {{ modelValue ? (result.current_parent ? result.current_parent.part_number_mix : modelValue + ' (?)') : '— root —' }}
        </span>
        <i class="mdi mdi-arrow-down pmp-chain-arr" />
        <span class="pmp-chain-node pmp-chain-self font-mono">{{ context.partNumberMix || '(mix part ini)' }}</span>
        <i class="mdi mdi-arrow-down pmp-chain-arr" />
        <span class="pmp-chain-node pmp-chain-child">
          {{ result.children_linked.length ? result.children_linked.length + ' WIP child' : '— belum ada child —' }}
        </span>
      </div>

      <div class="pmp-status">
        <i :class="statusIcon" />
        <span>{{ result.connectivity.message }}</span>
      </div>

      <!-- Kandidat WIP child terdekat (auto-link) -->
      <div v-if="result.connectivity.status === 'no_child' && result.children_candidates.length" class="pmp-cands">
        <p class="pmp-cands-title">WIP child terdekat (klik untuk tautkan ke mix ini):</p>
        <div class="pmp-cands-list">
          <div v-for="c in result.children_candidates" :key="c.id" class="pmp-cand">
            <div class="pmp-cand-info">
              <span class="pmp-mix font-mono">{{ c.part_number_mix }}</span>
              <span v-if="c.op != null" class="pmp-op">OP{{ c.op }}</span>
              <span v-if="c.current_parent_mix" class="pmp-cand-cur" title="parent saat ini">
                ↳ {{ c.current_parent_mix }}<span v-if="!c.parent_valid" class="pmp-invalid"> (putus)</span>
              </span>
            </div>
            <button
              type="button"
              class="pmp-link-btn"
              :disabled="linkingId === c.id || !context.excludeId"
              :title="!context.excludeId ? 'Simpan part ini dulu (butuh id)' : 'Tautkan sebagai child'"
              @click="linkChild(c)"
            >
              <i :class="linkingId === c.id ? 'mdi mdi-loading mdi-spin' : 'mdi mdi-link-variant'" />
              Tautkan
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { alertDialog, confirmDialog } from '@/utils/dialog';
import { ref, reactive, watch, onMounted, onUnmounted, computed } from 'vue'
import masterService from '@/services/Public/Welding/masterService'
import type { ConnectCandidate, ConnectSuggestResult } from '@/services/Public/Welding/masterService'

interface Context {
  partNumberMix: string
  partNumber?: string | null
  partNumberDelivery?: string | null
  model?: string | null
  carName?: string | null
  op?: number | null
  isWip?: boolean
  excludeId?: number | null
  area?: string | null
  category?: string | null   // MATERIAL/SCRAP → kandidat mother termasuk press (INHOUSE/OUTHOUSE)
}

const props = withDefaults(defineProps<{
  modelValue: string | null | undefined
  context: Context
  placeholder?: string
  hidePreview?: boolean
  /** id mother yg SUDAH tertaut (mode multi-mother) — ditandai & tak bisa dipilih lagi. */
  linkedIds?: number[]
}>(), {
  placeholder: '57407-BZ060-OP40 — ketik / pilih rekomendasi',
  hidePreview: false,
})

const emit = defineEmits<{
  'update:modelValue': [val: string | null]
  'linked': []
  'picked': [candidate: ConnectCandidate]
}>()

const rootRef  = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const open     = ref(false)
const loading  = ref(false)
const query    = ref(props.modelValue ?? '')
const result   = ref<ConnectSuggestResult | null>(null)
const linkingId = ref<number | null>(null)

const parents = computed(() => result.value?.parents ?? [])

const statusIcon = computed(() => {
  const s = result.value?.connectivity.status
  if (s === 'orphan_no_parent') return 'mdi mdi-link-off pmp-ic-warn'
  if (s === 'no_child')         return 'mdi mdi-alert-circle-outline pmp-ic-warn'
  return 'mdi mdi-check-circle-outline pmp-ic-ok'
})

let _timer: any = null
function fetchSuggest() {
  clearTimeout(_timer)
  _timer = setTimeout(async () => {
    loading.value = true
    try {
      result.value = await masterService.suggestConnections({
        part_number_mix:      props.context.partNumberMix || '',
        part_number:          props.context.partNumber || '',
        part_number_delivery: props.context.partNumberDelivery || '',
        model:                props.context.model || '',
        car_name:             props.context.carName || '',
        op:                   props.context.op ?? '',
        is_wip:               props.context.isWip ? 1 : 0,
        parent_part_mix:      props.modelValue || '',
        exclude_id:           props.context.excludeId ?? '',
        child_category:       props.context.category ?? '',
        area:                 props.context.area ?? '',
        search:               query.value.trim(),
        limit:                15,
      })
    } catch {
      result.value = null
    } finally {
      loading.value = false
    }
  }, 280)
}

function onInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value
  emit('update:modelValue', query.value.trim() || null)
  open.value = true
  fetchSuggest()
}

// Pilih mother dari dropdown. `parent_part_mix` (v-model) itu kolom LEGACY —
// tree/hierarki dibaca full dari ms_welding_parents (id-based), BUKAN dari
// string ini. Dulu bug: pilih mother di sini cuma nyimpen string kosmetik yg
// gak pernah beneran nautkan (tree tetap kosong walau form kelihatan "keisi").
// Sekarang: kalau part ini SUDAH tersimpan (ada excludeId/id), langsung
// panggil link_child (real, id-based) begitu dipilih — bukan nunggu form
// disave. Part yg BELUM tersimpan (create) belum punya id → parent kena
// tautkan oleh pemanggil (master-data.vue) SETELAH create sukses, lihat
// event 'picked' (parent form nyimpen p.id sbg pendingParentId).
const isLinked = (p: ConnectCandidate) => !!p.id && (props.linkedIds ?? []).includes(p.id)

async function choose(p: ConnectCandidate) {
  if (isLinked(p)) return
  query.value = p.part_number_mix || ''
  emit('update:modelValue', query.value || null)
  emit('picked', p)
  open.value = false
  // hidePreview = dipakai sbg chip MULTI-mother (INHOUSE/OUTHOUSE/WELDING WIP,
  // lihat master-data.vue) — mother BISA lebih dari satu di sana, jadi pilih
  // kandidat baru harus NAMBAH (lewat event 'picked' -> onAddMother, additive
  // INSERT IGNORE), BUKAN ganti. Detach+link di bawah HANYA utk mode single-
  // parent (preview rantai tampil, hidePreview=false) — dulu jalan tanpa syarat
  // di SINI juga, jadi nambah mother ke-2 diam2 mendetach mother ke-1 (bug
  // "menimpa mother yang sudah ada").
  if (!props.hidePreview && props.context.excludeId && p.id) {
    linkingId.value = p.id
    try {
      // Picker single-parent — pilih mother baru = GANTI, bukan nambah. Putus
      // mother lama dulu (kalau ada & beda dari yg baru dipilih) baru tautkan
      // yg baru, sama spt semantik reparent drag&drop di tree.
      const oldParentId = result.value?.current_parent?.id
      if (oldParentId && oldParentId !== p.id) {
        await masterService.detachParent(props.context.excludeId, oldParentId)
      }
      const res = await masterService.linkChild(props.context.excludeId, p.id)
      if (res.success) emit('linked')
      else alertDialog(res.message || 'Gagal menautkan ke mother.')
    } catch (e: any) {
      alertDialog(e?.response?.data?.message ?? 'Gagal menautkan ke mother.')
    } finally {
      linkingId.value = null
    }
  }
  fetchSuggest()
}

function clearValue() {
  query.value = ''
  emit('update:modelValue', null)
  fetchSuggest()
}

async function linkChild(c: ConnectCandidate) {
  if (!c.id || !props.context.excludeId) return
  linkingId.value = c.id
  try {
    const res = await masterService.linkChild(c.id, props.context.excludeId)
    if (res.success) {
      emit('linked')
      fetchSuggest()
    } else {
      alertDialog(res.message || 'Gagal menautkan.')
    }
  } catch (e: any) {
    alertDialog(e?.response?.data?.message ?? 'Gagal menautkan child.')
  } finally {
    linkingId.value = null
  }
}

// Re-fetch saat konteks berubah (mis. mix di-recompute setelah ganti part/op/delivery)
watch(
  () => [props.context.partNumberMix, props.context.partNumberDelivery, props.context.model, props.context.carName, props.context.op, props.context.isWip],
  () => fetchSuggest(),
)
// Sinkron query bila modelValue di-set dari luar (mis. clone)
watch(() => props.modelValue, (v) => { if ((v ?? '') !== query.value) query.value = v ?? '' })

// Tutup dropdown saat klik di luar. Pakai `pointerdown` fase CAPTURE: form modal
// induk memasang @click.stop di modal-box, jadi listener `click` biasa di document
// tidak pernah kebagian event → dropdown tak bisa ditutup (bug 2026-09-21).
function onDocPointer(e: PointerEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) open.value = false
}
function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && open.value) { e.stopPropagation(); open.value = false } }
onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer, true)
  document.addEventListener('keydown', onKey, true)
  fetchSuggest()
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointer, true)
  document.removeEventListener('keydown', onKey, true)
})
</script>

<style scoped>
.pmp { display: flex; flex-direction: column; gap: 8px; }
.pmp-item--linked { opacity: .55; cursor: not-allowed; }
.pmp-linked { margin-left: auto; font-size: 10.5px; font-weight: 700; color: var(--dm-on-green, #15803d); background: var(--dm-tint-green, #dcfce7); border-radius: 999px; padding: 1px 8px; }
.pmp-field { position: relative; }
.pmp-input-wrap { position: relative; display: flex; align-items: center; }
.pmp-lead-icon { position: absolute; left: 9px; color: var(--dm-faint, #94a3b8); font-size: 16px; pointer-events: none; }
.pmp-input {
  width: 100%; padding: 8px 30px 8px 30px; border: 1px solid var(--dm-border-strong, #cbd5e1); border-radius: 7px;
  font-size: 13px; font-family: ui-monospace, monospace; box-sizing: border-box;
}
.pmp-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
.pmp-clear { position: absolute; right: 6px; background: none; border: none; color: var(--dm-faint, #94a3b8); cursor: pointer; padding: 3px; border-radius: 4px; }
.pmp-clear:hover { color: #ef4444; background: var(--dm-tint-red, #fef2f2); }

.pmp-dropdown {
  position: absolute; z-index: 300; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--dm-surface, #fff); border: 1px solid var(--dm-border, #e2e8f0); border-radius: 8px;
  box-shadow: 0 10px 28px rgba(0,0,0,.14); max-height: 280px; overflow-y: auto;
}
.pmp-empty { padding: 12px; font-size: 12.5px; color: var(--dm-faint, #94a3b8); text-align: center; }
.pmp-list { display: flex; flex-direction: column; }
.pmp-item {
  display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left;
  padding: 8px 11px; border: none; border-bottom: 1px solid var(--dm-border, #f1f5f9); background: var(--dm-surface, #fff); cursor: pointer;
}
.pmp-item:hover { background: var(--dm-tint-blue, #eef2ff); }
.pmp-item--current { background: var(--dm-tint-green, #f0fdf4); }
.pmp-item-main { display: flex; align-items: center; gap: 7px; }
.pmp-type { font-size: 9.5px; font-weight: 800; padding: 1px 5px; border-radius: 4px; letter-spacing: .4px; }
.pmp-type.is-fp { background: var(--dm-tint-blue, #dbeafe); color: var(--dm-accent, #1e40af); }
.pmp-type.is-wip { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #92400e); }
.pmp-mix { font-size: 12.5px; font-weight: 700; color: var(--dm-text, #1e293b); }
.pmp-op { font-size: 10px; font-weight: 700; color: var(--dm-on-violet, #6d28d9); background: var(--dm-tint-violet, #ede9fe); padding: 1px 5px; border-radius: 4px; }
.pmp-area { margin-left: auto; font-size: 9.5px; font-weight: 700; color: var(--dm-on-teal, #0f766e); background: var(--dm-tint-teal, #ccfbf1); padding: 1px 6px; border-radius: 4px; white-space: nowrap; }
.pmp-item-sub { font-size: 11px; color: var(--dm-muted, #64748b); }
.pmp-pn { font-weight: 600; }
.pmp-dim { color: var(--dm-faint, #94a3b8); }
.pmp-reasons { display: flex; align-items: center; gap: 4px; margin-top: 2px; flex-wrap: wrap; }
.pmp-tag { font-size: 9.5px; background: var(--dm-tint-blue, #e0e7ff); color: var(--dm-on-violet, #4338ca); padding: 1px 6px; border-radius: 10px; }
.pmp-score { font-size: 9.5px; color: #cbd5e1; margin-left: auto; }

.pmp-preview { border: 1px solid var(--dm-border, #e2e8f0); border-radius: 8px; padding: 9px 11px; background: var(--dm-surface2, #f8fafc); }
.pmp-preview--orphan_no_parent { border-color: var(--dm-bd-red, #fca5a5); background: var(--dm-tint-red, #fef2f2); }
.pmp-preview--no_child { border-color: var(--dm-bd-amber, #fcd34d); background: var(--dm-tint-amber, #fffbeb); }
.pmp-preview--ok { border-color: var(--dm-bd-green, #86efac); background: var(--dm-tint-green, #f0fdf4); }
.pmp-chain { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; margin-bottom: 7px; }
.pmp-chain-node { font-size: 11.5px; padding: 2px 8px; border-radius: 5px; font-family: ui-monospace, monospace; }
.pmp-chain-parent { background: var(--dm-tint-blue, #e0f2fe); color: var(--dm-accent, #075985); }
.pmp-chain-parent.is-missing { background: var(--dm-tint-red, #fee2e2); color: var(--dm-on-red, #b91c1c); }
.pmp-chain-self { background: var(--dm-tint-violet, #ede9fe); color: var(--dm-on-violet, #5b21b6); font-weight: 700; }
.pmp-chain-child { background: var(--dm-tint-green, #ecfccb); color: var(--dm-on-green, #3f6212); }
.pmp-chain-arr { font-size: 13px; color: #cbd5e1; margin-left: 10px; }
.pmp-status { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--dm-text-2, #475569); }
.pmp-ic-ok { color: var(--dm-on-green, #16a34a); font-size: 15px; }
.pmp-ic-warn { color: #d97706; font-size: 15px; }

.pmp-cands { margin-top: 9px; border-top: 1px dashed var(--dm-border, #e2e8f0); padding-top: 8px; }
.pmp-cands-title { font-size: 11px; color: var(--dm-on-amber, #92400e); font-weight: 600; margin: 0 0 6px; }
.pmp-cands-list { display: flex; flex-direction: column; gap: 5px; }
.pmp-cand { display: flex; align-items: center; justify-content: space-between; gap: 8px; background: var(--dm-surface, #fff); border: 1px solid var(--dm-bd-amber, #fde68a); border-radius: 6px; padding: 5px 8px; }
.pmp-cand-info { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.pmp-cand-cur { font-size: 10.5px; color: var(--dm-faint, #94a3b8); }
.pmp-invalid { color: #ef4444; font-weight: 700; }
.pmp-link-btn { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #fff; background: #7c3aed; border: none; border-radius: 5px; padding: 4px 9px; cursor: pointer; white-space: nowrap; }
.pmp-link-btn:hover:not(:disabled) { background: #6d28d9; }
.pmp-link-btn:disabled { opacity: .5; cursor: not-allowed; }
.pmp-runout { margin-left: 6px; font-size: 10.5px; font-weight: 700; color: var(--dm-on-red, #b91c1c); }
</style>
