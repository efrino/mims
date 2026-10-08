<template>
  <div class="wui-page qa-page">
    <header class="wui-header">
      <div class="wui-header__icon"><i class="mdi mdi-qrcode"></i></div>
      <div class="wui-header__title">
        <h1>QR Aset</h1>
        <p>ID permanen per item untuk label QR. Cetak ulang label usang = QR yang sama. Scan untuk lihat riwayat PM, repair, dan spare part.</p>
      </div>
      <div class="wui-header__actions">
        <button class="wui-btn" :disabled="loading" @click="load"><i class="mdi mdi-refresh" :class="{ 'mdi-spin': loading }"></i> Segarkan</button>
        <button class="wui-btn" title="Unduh template Excel tambah dies" @click="downloadDiesTemplate"><i class="mdi mdi-file-download-outline"></i> Template</button>
        <label class="wui-btn wui-btn--teal" :class="{ 'qa-busy': importing }" title="Upload Excel dies (format template)">
          <i class="mdi" :class="importing ? 'mdi-loading mdi-spin' : 'mdi-file-upload-outline'"></i> Upload Excel
          <input type="file" accept=".xlsx,.xls" hidden :disabled="importing" @change="onImportFile">
        </label>
        <button class="wui-btn wui-btn--primary" :disabled="type !== 'DIES'" @click="openForm()"><i class="mdi mdi-plus"></i> Tambah Dies</button>
      </div>
    </header>

    <div class="wui-toolbar">
      <div class="wui-seg">
        <button v-for="t in TYPES" :key="t.k" type="button" :class="{ on: type === t.k }" :disabled="!t.ready" :title="t.ready ? '' : 'Tahap berikutnya'" @click="type = t.k">
          {{ t.label }}<small v-if="!t.ready" class="qa-soon">segera</small>
        </button>
      </div>
      <label class="qa-search">
        <i class="mdi mdi-magnify"></i>
        <input v-model.trim="search" placeholder="Cari part number, proses, model, line…">
        <button v-if="search" type="button" title="Hapus pencarian" @click="search = ''"><i class="mdi mdi-close-circle"></i></button>
      </label>
      <div class="wui-toolbar__right">
        <span class="wui-meta"><strong>{{ shown.length }}</strong> / {{ rows.length }} dies</span>
        <button v-if="hasActiveFilters" class="wui-btn wui-btn--sm" @click="clearFilter()"><i class="mdi mdi-filter-remove-outline"></i> Hapus filter</button>
        <div class="qa-dd" @focusout="onPrintBlur">
          <button class="wui-btn wui-btn--success" :disabled="!shown.length || printing" @click="printMenu = !printMenu">
            <i class="mdi mdi-printer-outline"></i> Cetak Label <i class="mdi mdi-chevron-down"></i>
          </button>
          <div v-if="printMenu" class="qa-dd-menu">
            <button type="button" @click="printPick(paged)"><i class="mdi mdi-file-outline"></i> Halaman ini <b>{{ paged.length }}</b></button>
            <button type="button" :disabled="!isNarrowed" :title="isNarrowed ? '' : 'Pakai filter kolom atau pencarian dulu'" @click="printPick(shown)">
              <i class="mdi mdi-filter-outline"></i> Hasil filter / cari <b>{{ isNarrowed ? shown.length : '—' }}</b>
            </button>
          </div>
        </div>
      </div>
    </div>

    <main class="wui-body">
      <div class="wui-stats">
        <div class="wui-stat"><span class="wui-stat__lbl">Total dies</span><span class="wui-stat__val">{{ rows.length }}</span><span class="wui-stat__sub">{{ activeCount }} aktif</span></div>
        <div class="wui-stat"><span class="wui-stat__lbl">Terhubung master data</span><span class="wui-stat__val">{{ linkedCount }}</span><span class="wui-stat__sub">{{ rows.length - linkedCount }} belum terhubung</span></div>
        <div class="wui-stat"><span class="wui-stat__lbl">Pairing terverifikasi</span><span class="wui-stat__val">{{ verifiedCount }}</span><span class="wui-stat__sub">dari {{ linkedCount }} dies terhubung</span></div>
        <div class="wui-stat" :class="{ 'wui-stat--warn': pmDueCount }"><span class="wui-stat__lbl">PM segera / lewat</span><span class="wui-stat__val">{{ pmDueCount }}</span><span class="wui-stat__sub">jatuh tempo ≤ 30 hari</span></div>
        <div class="wui-stat" :class="{ 'wui-stat--warn': unprinted }"><span class="wui-stat__lbl">Belum dicetak</span><span class="wui-stat__val">{{ unprinted }}</span><span class="wui-stat__sub">label QR</span></div>
        <div class="wui-stat"><span class="wui-stat__lbl">Aktivitas tercatat</span><span class="wui-stat__val">{{ totalActivity }}</span><span class="wui-stat__sub">PM / repair / spare part</span></div>
      </div>

      <div v-if="error" class="wui-card wui-card__pad qa-error"><i class="mdi mdi-alert-circle"></i> {{ error }}</div>

      <div class="wui-table-wrap">
        <table class="wui-table qa-table">
          <thead>
            <tr>
              <th class="num">No</th><th>Gambar</th><th>QR</th>
              <th v-for="c in FILTER_HEADS" :key="c.k" :class="c.cls">
                <span class="qa-th">{{ c.label }}
                  <button class="qa-fbtn" :class="{ 'qa-fbtn--on': isFilterActive(c.k) }" :title="isFilterActive(c.k) ? 'Filter aktif — klik untuk ubah' : `Filter ${c.label}`" @click.stop="openFilter(c.k, $event)">
                    <i class="mdi" :class="isFilterActive(c.k) ? 'mdi-filter' : 'mdi-filter-outline'"></i>
                  </button>
                </span>
              </th>
              <th class="qa-th-act">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in paged" :key="r.id" :class="{ 'qa-off': !r.is_active }" title="Dobel klik untuk detail" @dblclick="openDetail(r)">
              <td class="num qa-no">{{ pageStart + i + 1 }}</td>
              <td>
                <button type="button" class="qa-thumb" title="Lihat detail" @click="openDetail(r)">
                  <img v-if="r.image" :src="diesImageUrl(r.image)" alt="" loading="lazy">
                  <i v-else class="mdi mdi-image-off-outline"></i>
                </button>
              </td>
              <td>
                <button type="button" class="qa-thumb qa-thumb--qr" title="Lihat detail" @click="openDetail(r)">
                  <img v-if="qrThumbs[r.asset_code]" :src="qrThumbs[r.asset_code]" alt="">
                </button>
              </td>
              <td v-if="spans[i]" :rowspan="spans[i]" class="nowrap qa-merged">
                <div class="qa-pn-line">
                  <button type="button" class="qa-pn" title="Lihat detail" @click="openDetail(r)">{{ r.part_number || r.dies_code }}</button>
                  <span v-if="r.master_part_info" class="qa-pinfo" :title="r.master_part_info">{{ r.master_part_info }}</span>
                </div>
                <div class="qa-links">
                  <span v-for="p in linkedOf(r)" :key="p" class="wui-chip wui-chip--green" title="Part master data terhubung">{{ p }}</span>
                  <span v-if="!linkedOf(r).length" class="wui-chip wui-chip--amber">belum terhubung</span>
                </div>
              </td>
              <td v-if="spans[i]" :rowspan="spans[i]" class="nowrap qa-merged">
                <button v-if="groupVerified(i)" type="button" class="qa-verified" :title="`Pairing terverifikasi oleh ${r.pairing_verified_by} · ${r.pairing_verified_at} — klik untuk lihat`" @click="openVerify(r)">
                  <i class="mdi mdi-check-decagram"></i> Terverifikasi
                </button>
                <button v-else type="button" class="qa-verify-btn" :disabled="!linkedOf(r).length" title="Cek & verifikasi pairing part number" @click="openVerify(r)">
                  <i class="mdi mdi-shield-check-outline"></i> Verifikasi
                </button>
              </td>
              <td class="nowrap"><span class="qa-die">{{ r.die_no ? `${r.die_no}/${r.die_total}` : '—' }}</span></td>
              <td class="qa-proc" :title="r.dies_name ?? ''">{{ r.dies_name || '—' }}</td>
              <td v-if="spans[i]" :rowspan="spans[i]" class="nowrap qa-merged" :title="r.master_model ? 'Dari master data part' : 'Belum terhubung ke master — isi Excel'">
                <span class="qa-model">{{ modelOf(r) }}</span><i v-if="!r.master_model && r.model" class="mdi mdi-alert-circle-outline qa-warn"></i>
              </td>
              <td class="nowrap"><span v-if="r.line" class="wui-chip wui-chip--blue">{{ r.line }}</span><span v-else>—</span></td>
              <td class="nowrap">
                <span v-if="r.print_count" class="wui-chip wui-chip--green" :title="`Terakhir ${r.last_printed_at}`">{{ r.print_count }}×</span>
                <span v-else class="wui-chip wui-chip--amber">belum</span>
              </td>
              <td><span class="wui-chip" :class="r.is_active ? 'wui-chip--blue' : ''">{{ r.is_active ? 'Aktif' : 'Nonaktif' }}</span></td>
              <td class="nowrap">
                <span class="wui-chip" :class="PM_STATE[pmOf(r).state].chip" :title="pmTitle(r)">{{ PM_STATE[pmOf(r).state].label }}</span>
              </td>
              <td class="nowrap">
                <button class="wui-btn wui-btn--sm wui-btn--icon" title="Cetak label" :disabled="printing" @click="printLabels([r])"><i class="mdi mdi-printer-outline"></i></button>
                <button class="wui-btn wui-btn--sm wui-btn--icon" title="Ubah" @click="openForm(r)"><i class="mdi mdi-pencil-outline"></i></button>
                <button class="wui-btn wui-btn--sm wui-btn--icon" :title="r.is_active ? 'Nonaktifkan' : 'Aktifkan'" @click="toggle(r)"><i class="mdi" :class="r.is_active ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"></i></button>
                <button class="wui-btn wui-btn--sm wui-btn--icon qa-del" title="Hapus dies" @click="removeDies(r)"><i class="mdi mdi-delete-outline"></i></button>
              </td>
            </tr>
            <!-- Baris pengisi: halaman terakhir tetap 10 baris supaya tinggi baris seragam -->
            <tr v-for="n in (shown.length ? PAGE_SIZE - paged.length : 0)" :key="'pad' + n" class="qa-pad"><td colspan="13"></td></tr>
            <tr v-if="!shown.length"><td colspan="13" class="wui-table-empty">{{ loading ? 'Memuat…' : rows.length ? 'Tidak ada yang cocok.' : 'Belum ada dies. Klik "Tambah Dies".' }}</td></tr>
          </tbody>
        </table>
      </div>
      <div v-if="shown.length" class="qa-pager">
        <span class="wui-meta">{{ pageStart + 1 }}–{{ pageStart + paged.length }} dari <strong>{{ shown.length }}</strong></span>
        <div class="qa-pages">
          <button type="button" :disabled="page === 1" title="Sebelumnya" @click="page--"><i class="mdi mdi-chevron-left"></i></button>
          <template v-for="(n, k) in pageList" :key="k">
            <span v-if="n === 0" class="qa-gap">…</span>
            <button v-else type="button" :class="{ on: n === page }" @click="page = n">{{ n }}</button>
          </template>
          <button type="button" :disabled="page === pageCount" title="Berikutnya" @click="page++"><i class="mdi mdi-chevron-right"></i></button>
        </div>
      </div>
    </main>

    <FilterDropdown
      :show="showFilter"
      :title="filterTitle"
      :position="filterStyle"
      :options="visibleOptions"
      :total-options="filterOptions.length"
      :all-selected="allSelected"
      :some-selected="someSelected"
      searchable
      :search-query="filterSearch"
      :active-count="filters[filterField].length"
      :merge-existing="filterMerge"
      @close="closeFilter"
      @apply="applyFilter"
      @toggle-merge="filterMerge = $event"
      @reset="clearFilter(filterField)"
      @toggle-all="handleToggleAll"
      @toggle-option="handleToggleOption"
      @search="handleSearch"
      @invert="invertSelection"
    />

    <!-- Form tambah / ubah dies -->
    <div v-if="form" class="wui-overlay" @click.self="form = null">
      <form class="wui-modal qa-modal" @submit.prevent="saveForm">
        <div class="wui-modal__head">
          <i class="mdi mdi-qrcode-edit"></i>
          <strong>{{ form.id ? `Ubah dies ${form.data.part_number} · OP ${form.data.die_no}/${form.data.die_total}` : 'Tambah Dies' }}</strong>
          <button type="button" class="wui-btn wui-btn--sm wui-btn--icon qa-x" @click="form = null"><i class="mdi mdi-close"></i></button>
        </div>
        <div class="wui-modal__body qa-grid">
          <div class="qa-span qa-group">Identitas dies</div>
          <label class="qa-span">Part number <b>*</b><input v-model.trim="form.data.part_number" class="wui-input" required maxlength="100" placeholder="boleh ringkas, mis. 51474-BZ070/80"></label>
          <label>Die ke (OP) <b>*</b><input v-model.trim="form.data.die_no" class="wui-input" required maxlength="10" placeholder="mis. 1 atau 2-3"></label>
          <label>Total die <b>*</b><input v-model.trim="form.data.die_total" class="wui-input" type="number" min="1" max="20" required placeholder="mis. 3"></label>
          <label>Proses<input v-model.trim="form.data.dies_name" class="wui-input" maxlength="150" placeholder="mis. DRAW, TR-PIE"></label>
          <label>Line<input v-model.trim="form.data.line" class="wui-input" maxlength="20" placeholder="mis. A, 300T"></label>
          <div class="qa-span qa-code-preview"><i class="mdi mdi-identifier"></i> Kode dies: <b>{{ formCode || '—' }}</b></div>
          <label class="qa-span">Part terhubung (master data)
            <textarea v-model="form.data.linked_parts" class="wui-input qa-textarea" placeholder="kosongkan = otomatis dari part number; atau isi PN pisah koma"></textarea>
          </label>
          <div class="qa-span qa-group">Data PM per part <small>— berlaku untuk semua dies part ini</small></div>
          <label>Avg pcs / bulan<input v-model.trim="form.data.avg_pcs_month" class="wui-input" inputmode="decimal" maxlength="15" placeholder="mis. 1253"></label>
          <label>Material (MPa)<input v-model.trim="form.data.material_mpa" class="wui-input" maxlength="30" placeholder="mis. 440"></label>
          <label>Frekuensi PM (tiap … bulan)<input v-model.trim="form.data.pm_interval_month" class="wui-input" type="number" min="1" max="120" placeholder="1/6M → 6"></label>
          <span></span>
          <div class="qa-span qa-group">Spesifikasi dies</div>
          <label>Tonnage dibutuhkan (T)<input v-model.trim="form.data.tonnage_required" class="wui-input" maxlength="50"></label>
          <label>Panjang (mm)<input v-model.trim="form.data.dies_length" class="wui-input" maxlength="50"></label>
          <label>Lebar (mm)<input v-model.trim="form.data.dies_width" class="wui-input" maxlength="50"></label>
          <label>Tinggi (mm)<input v-model.trim="form.data.dies_height" class="wui-input" maxlength="50"></label>
        </div>
        <div class="qa-foot">
          <button type="button" class="wui-btn" @click="form = null">Batal</button>
          <button class="wui-btn wui-btn--primary" :disabled="saving"><i class="mdi mdi-content-save" :class="{ 'mdi-spin': saving }"></i> Simpan</button>
        </div>
      </form>
    </div>

    <!-- Verifikasi pairing part number (gaya verifikasi BOM di Master Data) -->
    <div v-if="verify" class="wui-overlay" @click.self="verify = null">
      <div class="wui-modal qa-verify">
        <div class="wui-modal__head">
          <i class="mdi mdi-shield-check-outline"></i>
          <strong>Verifikasi pairing · {{ verify.part }}</strong>
          <span class="wui-hint">{{ verify.dies.length }} dies</span>
          <button type="button" class="wui-btn wui-btn--sm wui-btn--icon qa-x" @click="verify = null"><i class="mdi mdi-close"></i></button>
        </div>
        <div class="wui-modal__body">
          <p class="qa-verify-lead">Pastikan dies di bawah memang dipakai untuk part master data berikut.</p>
          <div v-if="verify.loading" class="wui-hint"><i class="mdi mdi-loading mdi-spin"></i> Memuat part…</div>
          <table v-else class="wui-table">
            <thead><tr><th>Part master data</th><th>Nama part</th><th>Model</th><th>Area · Layer</th></tr></thead>
            <tbody>
              <tr v-for="p in verify.parts" :key="p.part_number">
                <td class="nowrap"><strong class="qa-pn qa-pn--static">{{ p.part_number }}</strong></td>
                <td>{{ p.part_name || '—' }}</td>
                <td class="nowrap">{{ p.model || '—' }}</td>
                <td class="nowrap">{{ p.location || '—' }}</td>
              </tr>
              <tr v-if="!verify.parts.length"><td colspan="4" class="wui-table-empty">Belum ada part terhubung — isi lewat tombol Ubah.</td></tr>
            </tbody>
          </table>
          <div class="qa-verify-dies">
            <span v-for="d in verify.dies" :key="d.id" class="wui-chip">Die {{ dieOf(d) }} · {{ d.dies_name }}</span>
          </div>
          <p v-if="verify.dies[0]?.pairing_verified_at" class="qa-verify-by"><i class="mdi mdi-check-decagram"></i> Diverifikasi {{ verify.dies[0].pairing_verified_by }} · {{ verify.dies[0].pairing_verified_at }}</p>
        </div>
        <div class="qa-foot">
          <button type="button" class="wui-btn" @click="openForm(verify.dies[0]); verify = null"><i class="mdi mdi-pencil-outline"></i> Ubah part terhubung</button>
          <button v-if="verify.dies.every(d => d.pairing_verified_at)" type="button" class="wui-btn wui-btn--danger" :disabled="verify.saving" @click="submitVerify(false)">Batalkan verifikasi</button>
          <button v-else type="button" class="wui-btn wui-btn--success" :disabled="verify.saving || verify.loading || !verify.parts.length" @click="submitVerify(true)">
            <i class="mdi mdi-check-decagram"></i> Benar, verifikasi
          </button>
        </div>
      </div>
    </div>

    <!-- Detail: foto, QR, link halaman aset -->
    <div v-if="detail" class="wui-overlay" @click.self="detail = null">
      <div class="wui-modal qa-detail">
        <div class="wui-modal__head">
          <i class="mdi mdi-qrcode"></i>
          <strong>{{ detail.part_number }} · Die {{ detail.die_no }}/{{ detail.die_total }}</strong>
          <span class="wui-hint">{{ detail.dies_name }} · {{ modelOf(detail) }}<template v-if="detail.line"> · Line {{ detail.line }}</template></span>
          <button type="button" class="wui-btn wui-btn--sm wui-btn--icon qa-x" @click="detail = null"><i class="mdi mdi-close"></i></button>
        </div>
        <div class="wui-modal__body qa-detail-body">
          <div class="qa-detail-img">
            <img v-if="detail.image" :src="diesImageUrl(detail.image)" alt="Foto dies">
            <div v-else class="qa-detail-noimg"><i class="mdi mdi-image-off-outline"></i> Belum ada foto</div>
            <label class="wui-btn wui-btn--sm" :class="{ 'qa-busy': uploading }">
              <i class="mdi" :class="uploading ? 'mdi-loading mdi-spin' : 'mdi-camera-outline'"></i> {{ detail.image ? 'Ganti foto' : 'Upload foto' }}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden :disabled="uploading" @change="onImage">
            </label>
          </div>
          <div class="qa-detail-qr">
            <img v-if="qrBig" :src="qrBig" alt="QR">
            <div class="qa-detail-actions">
              <a class="wui-btn wui-btn--sm wui-btn--primary" :href="scanHref(detail.asset_code)" target="_blank"><i class="mdi mdi-open-in-new"></i> Buka halaman aset</a>
              <button type="button" class="wui-btn wui-btn--sm" @click="copyLink(detail.asset_code)"><i class="mdi" :class="copied ? 'mdi-check' : 'mdi-content-copy'"></i> {{ copied ? 'Tersalin' : 'Salin link' }}</button>
              <button type="button" class="wui-btn wui-btn--sm wui-btn--success" :disabled="printing" @click="printLabels([detail])"><i class="mdi mdi-printer-outline"></i> Cetak label</button>
            </div>
          </div>
          <dl class="qa-detail-info">
            <div><dt>Avg pcs / bulan</dt><dd>{{ detail.avg_pcs_month ? Number(detail.avg_pcs_month).toLocaleString('id-ID') : '—' }}</dd></div>
            <div><dt>Material</dt><dd>{{ detail.material_mpa ? detail.material_mpa + ' MPa' : '—' }}</dd></div>
            <div><dt>Frekuensi PM</dt><dd>{{ detail.pm_interval_month ? `1× tiap ${detail.pm_interval_month} bulan` : '—' }}</dd></div>
            <div><dt>PM terakhir</dt><dd>{{ detail.last_pm ? fmtDate(detail.last_pm) : '—' }} <span class="wui-chip" :class="PM_STATE[pmOf(detail).state].chip">{{ PM_STATE[pmOf(detail).state].label }}</span></dd></div>
            <div><dt>Tonnage</dt><dd>{{ detail.tonnage_required ? detail.tonnage_required + ' T' : '—' }}</dd></div>
            <div><dt>Dimensi (P×L×T)</dt><dd>{{ dimText(detail) }}</dd></div>
            <div><dt>Aktivitas</dt><dd>{{ detail.n_activity }}<template v-if="detail.last_activity"> · terakhir {{ fmtDate(detail.last_activity) }}</template></dd></div>
            <div><dt>Total biaya</dt><dd>{{ detail.total_cost ? rupiah(detail.total_cost) : '—' }}</dd></div>
            <div class="qa-span"><dt>Part terhubung</dt><dd>{{ linkedOf(detail).join(', ') || '—' }}</dd></div>
          </dl>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import assetQrService, { assetUrl, diesImageUrl, pmStatus, PM_STATE, type DiesAsset, type DiesForm, type LinkedPart } from '@/services/Public/Asset/assetQrService'
import { useClientColumnFilters } from '@/composables/useClientColumnFilters'
import { printQrLabels } from '@/utils/printQrLabels'
import { downloadDiesTemplate, readDiesFile } from '@/utils/diesTemplate'
import FilterDropdown from '@/components/welding/mutation/FilterDropdown.vue'
import { useRouter } from 'vue-router'

// Urutan digitalisasi bertahap; tipe berikutnya dibuka saat tahapnya dikerjakan.
const TYPES = [
  { k: 'DIES', label: 'Dies', ready: true },
  { k: 'JIG', label: 'Jig', ready: false },
  { k: 'ROBOT', label: 'Robot Welding', ready: false },
  { k: 'PRESS', label: 'Mesin Press', ready: false },
  { k: 'WELD', label: 'Mesin Welding', ready: false },
] as const
const type = ref<(typeof TYPES)[number]['k']>('DIES')

const router = useRouter()
const scanHref = (code: string) => router.resolve({ name: 'PublicAssetScan', params: { code } }).href
const linkedOf = (r: DiesAsset) => (r.linked_parts ? r.linked_parts.split(',') : [])
// Model standar = dari master data part terhubung; isi Excel hanya cadangan.
const modelOf = (r: DiesAsset) => r.master_model || r.model || '—'
const dieOf = (r: DiesAsset) => (r.die_no ? `${r.die_no}/${r.die_total}` : '')
const dimText = (r: DiesAsset) =>
  r.dies_length || r.dies_width || r.dies_height ? `${r.dies_length || '?'} × ${r.dies_width || '?'} × ${r.dies_height || '?'}` : '—'
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const pmOf = (r: DiesAsset) => pmStatus(r.pm_interval_month, r.last_pm)
function pmTitle(r: DiesAsset) {
  const p = pmOf(r)
  if (!p.due) return p.state === 'unset' ? 'Isi frekuensi PM lewat tombol Ubah' : 'Catat PM pertama lewat halaman aset (Tambah informasi → PM)'
  return `Jatuh tempo ${p.due.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} (${p.days! < 0 ? `lewat ${-p.days!} hari` : `${p.days} hari lagi`})`
}
const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID')

const rows = ref<DiesAsset[]>([])
const loading = ref(false)
const error = ref('')
const search = ref('')

async function load() {
  loading.value = true; error.value = ''
  try { rows.value = await assetQrService.listDies(); buildQrThumbs() }
  catch (e: any) { error.value = e?.response?.data?.message ?? 'Gagal memuat data.' }
  finally { loading.value = false }
}
onMounted(load)

// ── Filter kolom gaya Excel + cari bebas ──
const FILTER_HEADS = [
  { k: 'part', label: 'Part Number', cls: '' },
  { k: 'verify', label: 'Verifikasi', cls: '' },
  { k: 'die', label: 'Die', cls: '' },
  { k: 'proc', label: 'Proses', cls: '' },
  { k: 'model', label: 'Model', cls: '' },
  { k: 'line', label: 'Line', cls: '' },
  { k: 'print', label: 'Cetak', cls: '' },
  { k: 'status', label: 'Status', cls: '' },
  { k: 'pm', label: 'Status PM', cls: '' },
] as const
const {
  filters, filtered, showFilter, filterField, filterTitle, filterStyle, filterOptions, filterSearch, filterMerge,
  visibleOptions, allSelected, someSelected, hasActiveFilters, isFilterActive,
  openFilter, closeFilter, handleToggleAll, handleToggleOption, invertSelection, handleSearch, applyFilter, clearFilter,
} = useClientColumnFilters(rows, {
  part: { title: 'Part Number', get: r => [r.part_number ?? '', ...linkedOf(r)] },
  verify: { title: 'Verifikasi pairing', get: r => (r.pairing_verified_at ? 'Terverifikasi' : linkedOf(r).length ? 'Belum diverifikasi' : 'Belum terhubung') },
  die: { title: 'Die', get: dieOf },
  proc: { title: 'Proses', get: r => r.dies_name },
  model: { title: 'Model', get: r => modelOf(r) },
  line: { title: 'Line', get: r => r.line },
  print: { title: 'Cetak', get: r => (r.print_count ? 'Sudah dicetak' : 'Belum dicetak') },
  status: { title: 'Status', get: r => (r.is_active ? 'Aktif' : 'Nonaktif') },
  pm: { title: 'Status PM', get: r => PM_STATE[pmOf(r).state].label },
})
const shown = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return filtered.value
  return filtered.value.filter(r => [r.dies_code, r.dies_name, r.part_number, r.linked_parts, r.master_model, r.model, r.line].some(v => v?.toLowerCase().includes(q)))
})

// ── Pagination: 10 baris per halaman (tanpa scroll vertikal) ──
const PAGE_SIZE = 10
const page = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(shown.value.length / PAGE_SIZE)))
const pageStart = computed(() => (page.value - 1) * PAGE_SIZE)
const paged = computed(() => shown.value.slice(pageStart.value, pageStart.value + PAGE_SIZE))
watch(shown, () => { if (page.value > pageCount.value) page.value = 1 })
watch([search, filters], () => { page.value = 1 }, { deep: true })
/** Nomor halaman ringkas: 1 … 4 5 6 … 46 (0 = celah). */
const pageList = computed(() => {
  const n = pageCount.value, c = page.value
  const set = [...new Set([1, n, c - 1, c, c + 1].filter(x => x >= 1 && x <= n))].sort((a, b) => a - b)
  return set.flatMap((x, k) => (k && x - set[k - 1] > 1 ? [0, x] : [x]))
})

// Baris dies berurutan dgn part number sama digabung (rowspan) di kolom Part Number & Model.
// spans[i] = jumlah baris grup bila i baris pertama grup di halaman ini, 0 bila lanjutan.
const spans = computed(() => {
  const list = paged.value
  const out = new Array<number>(list.length).fill(0)
  for (let i = 0; i < list.length;) {
    let j = i + 1
    while (j < list.length && list[j].part_number === list[i].part_number) j++
    out[i] = j - i
    i = j
  }
  return out
})

const activeCount = computed(() => rows.value.filter(r => r.is_active).length)
const linkedCount = computed(() => rows.value.filter(r => r.linked_parts).length)
const verifiedCount = computed(() => rows.value.filter(r => r.pairing_verified_at).length)
const pmDueCount = computed(() => rows.value.filter(r => ['soon', 'overdue'].includes(pmOf(r).state)).length)
const unprinted = computed(() => rows.value.filter(r => !r.print_count).length)
const totalActivity = computed(() => rows.value.reduce((s, r) => s + r.n_activity, 0))

// ── Verifikasi pairing per part (semua dies part itu) ──
const groupOfIdx = (i: number) => paged.value.slice(i, i + spans.value[i])
const groupVerified = (i: number) => groupOfIdx(i).every(r => r.pairing_verified_at)
const verify = ref<{ part: string; dies: DiesAsset[]; parts: LinkedPart[]; loading: boolean; saving: boolean } | null>(null)
async function openVerify(r: DiesAsset) {
  const dies = rows.value.filter(x => x.part_number === r.part_number)
  verify.value = { part: r.part_number ?? '', dies, parts: [], loading: true, saving: false }
  try { verify.value.parts = await assetQrService.groupParts(verify.value.part) }
  catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal memuat part.') }
  finally { if (verify.value) verify.value.loading = false }
}
async function submitVerify(ok: boolean) {
  if (!verify.value) return
  verify.value.saving = true
  try {
    const res = await assetQrService.verifyPairing(verify.value.part, ok)
    if (!res.success) { alert(res.message); return }
    verify.value = null
    await load()
  } catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal menyimpan verifikasi.') }
  finally { if (verify.value) verify.value.saving = false }
}

// ── Form ──
const emptyForm = (): DiesForm => ({ dies_code: '', dies_name: '', part_number: '', model: '', line: '', tonnage_required: '', dies_length: '', dies_width: '', dies_height: '', die_no: '', die_total: '', avg_pcs_month: '', material_mpa: '', pm_interval_month: '', linked_parts: '' })
const form = ref<{ id: number | null; data: DiesForm } | null>(null)
const saving = ref(false)
function openForm(r?: DiesAsset) {
  form.value = r
    ? { id: r.id, data: { dies_code: r.dies_code, dies_name: r.dies_name ?? '', part_number: r.part_number ?? '', model: r.model ?? '', line: r.line ?? '', tonnage_required: r.tonnage_required ?? '', dies_length: r.dies_length ?? '', dies_width: r.dies_width ?? '', dies_height: r.dies_height ?? '', die_no: r.die_no ?? '', die_total: r.die_total ? String(r.die_total) : '', avg_pcs_month: r.avg_pcs_month ? String(Number(r.avg_pcs_month)) : '', material_mpa: r.material_mpa ?? '', pm_interval_month: r.pm_interval_month ?? '', linked_parts: linkedOf(r).join(', ') } }
    : { id: null, data: emptyForm() }
}
// Kode dies = "PART NO. #n/N" (sama dengan import Excel); tetap untuk dies yang sudah ada.
const formCode = computed(() => {
  const d = form.value?.data
  if (!d) return ''
  if (form.value?.id) return d.dies_code ?? ''
  return d.part_number && d.die_no && d.die_total ? `${d.part_number.toUpperCase()} #${d.die_no}/${d.die_total}` : ''
})
async function saveForm() {
  if (!form.value) return
  if (!form.value.id) form.value.data.dies_code = formCode.value
  saving.value = true
  try {
    const f = form.value
    const res = f.id ? await assetQrService.updateDies(f.id, f.data) : await assetQrService.storeDies(f.data)
    if (!res.success) { alert(res.message); return }
    form.value = null
    await load()
  } catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal menyimpan.') }
  finally { saving.value = false }
}

// ── Thumbnail QR (isi = link halaman aset, sama dengan label) ──
const qrThumbs = ref<Record<string, string>>({})
async function buildQrThumbs() {
  const out: Record<string, string> = { ...qrThumbs.value }
  for (const r of rows.value) {
    if (!out[r.asset_code]) out[r.asset_code] = await QRCode.toDataURL(assetUrl(r.asset_code), { width: 96, margin: 0, errorCorrectionLevel: 'M' })
  }
  qrThumbs.value = out
}

// ── Modal detail: foto + QR + link ──
const detail = ref<DiesAsset | null>(null)
const qrBig = ref('')
const uploading = ref(false)
const copied = ref(false)
async function openDetail(r: DiesAsset) {
  detail.value = r; copied.value = false; qrBig.value = ''
  qrBig.value = await QRCode.toDataURL(assetUrl(r.asset_code), { width: 320, margin: 1, errorCorrectionLevel: 'M' })
}
async function onImage(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !detail.value) return
  uploading.value = true
  try {
    const res = await assetQrService.uploadImage(detail.value.id, file)
    if (!res.success) { alert(res.message); return }
    detail.value.image = res.image ?? null
  } catch (err: any) { alert(err?.response?.data?.message ?? 'Gagal upload foto.') }
  finally { uploading.value = false }
}
async function copyLink(code: string) {
  try { await navigator.clipboard.writeText(assetUrl(code)); copied.value = true } catch { prompt('Salin link:', assetUrl(code)) }
}

async function removeDies(r: DiesAsset) {
  if (!confirm(`Hapus dies ${r.part_number} · OP ${dieOf(r)} (${r.dies_name ?? '-'})?\nLabel QR-nya tidak berlaku lagi; riwayat tetap tersimpan.`)) return
  try {
    const res = await assetQrService.deleteDies(r.id)
    if (!res.success) { alert(res.message); return }
    await load()
  } catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal menghapus dies.') }
}

// ── Upload Excel (format template) ──
const importing = ref(false)
async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importing.value = true
  try {
    const rows = await readDiesFile(file)
    if (!rows.length) { alert('File tidak berisi baris data.'); return }
    if (!confirm(`Import ${rows.length} baris dari ${file.name}?\nDies yang sudah ada (part number + die sama) akan diperbarui.`)) return
    const res = await assetQrService.importDies(rows)
    const errs = res.errors ?? []
    alert(`${res.message}${res.skipped ? `\n${res.skipped} baris tanpa DIE dilewati.` : ''}${errs.length ? `\n\n${errs.length} baris gagal:\n${errs.slice(0, 10).join('\n')}${errs.length > 10 ? '\n…' : ''}` : ''}`)
    await load()
  } catch (err: any) { alert(err?.response?.data?.message ?? err?.message ?? 'Gagal import Excel.') }
  finally { importing.value = false }
}

async function toggle(r: DiesAsset) {
  try {
    const res = await assetQrService.toggleActive(r.id)
    if (res.success) r.is_active = res.is_active ?? (r.is_active ? 0 : 1)
  } catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal ubah status.') }
}

// ── Cetak label QR ──
const printing = ref(false)
// Cetak terpilih saja: halaman ini, atau hasil filter/cari (bukan semua dies sekaligus).
const printMenu = ref(false)
const isNarrowed = computed(() => hasActiveFilters.value || !!search.value)
function onPrintBlur(e: FocusEvent) {
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) printMenu.value = false
}
function printPick(list: DiesAsset[]) {
  printMenu.value = false
  if (list.length > 10 && !confirm(`Cetak ${list.length} label (1 label per lembar)?`)) return
  printLabels(list)
}
// Label QR: 1 label per lembar, isi QR = link halaman aset (tetap sama tiap cetak ulang).
async function printLabels(list: DiesAsset[]) {
  if (!list.length) return
  printing.value = true
  try {
    await printQrLabels(list.map(r => ({ url: assetUrl(r.asset_code), title: r.part_number || r.dies_code, sub: `OP ${dieOf(r) || '-'}` })))
    await assetQrService.markPrinted(list.map(r => r.id))
    await load()
  } catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal cetak label.') }
  finally { printing.value = false }
}
</script>

<style scoped>
.qa-soon { margin-left: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: var(--wui-faint); }
.wui-seg button:disabled { cursor: not-allowed; opacity: .6; }
.qa-error { color: var(--wui-danger); }
/* Tabel — tipografi mengikuti Mutasi Welding: angka tabular, PN tebal navy, sel padat. */
.qa-table tbody td { font-size: 11.5px; vertical-align: middle; }
.qa-th { display: inline-flex; align-items: center; gap: 6px; }
.qa-fbtn { background: rgba(255, 255, 255, .12); border: 1px solid rgba(255, 255, 255, .08); color: rgba(255, 255, 255, .85); cursor: pointer; padding: 2px 4px; border-radius: 4px; font-size: 11px; line-height: 1; }
.qa-fbtn:hover { background: rgba(255, 255, 255, .22); }
.qa-fbtn--on { background: #f59e0b !important; border-color: #d97706 !important; color: #1a1a1a !important; }
.qa-no { color: var(--wui-faint); font-weight: 600; }
.qa-pn { background: none; border: 0; padding: 0; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; color: var(--wui-navy-1); letter-spacing: .01em; }
.qa-pn:hover { text-decoration: underline; }
.qa-die { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--wui-text); }
.qa-proc { font-weight: 600; color: var(--wui-text-2); }
.qa-model { font-weight: 600; }
.qa-table td.qa-merged { background: var(--wui-surface) !important; border-right: 1px solid var(--wui-row-line); }
.qa-verified, .qa-verify-btn { display: inline-flex; align-items: center; gap: 3px; padding: 1px 7px; border-radius: 999px; font: inherit; font-size: 10px; font-weight: 700; cursor: pointer; vertical-align: 1px; }
.qa-verified { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.qa-verify-btn { background: var(--wui-surface); color: var(--wui-muted); border: 1px dashed var(--wui-border-strong); }
.qa-verify-btn:hover:not(:disabled) { color: var(--wui-accent-text); border-color: var(--wui-focus); }
.qa-verify-btn:disabled { opacity: .5; cursor: not-allowed; }
:root.dark .qa-verified { background: rgba(16, 185, 129, .14); color: #6ee7b7; border-color: rgba(16, 185, 129, .35); }
.qa-verify { width: 720px; }
.qa-verify-lead { margin: 0 0 10px; font-size: 12px; color: var(--wui-text-2); }
.qa-verify-dies { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px; }
.qa-verify-by { margin: 10px 0 0; font-size: 12px; font-weight: 600; color: #047857; }
.qa-pn--static { cursor: default; }
.qa-pinfo { font-size: 10.5px; color: var(--wui-muted); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qa-group { font-size: 11px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--wui-accent-text); border-bottom: 1px solid var(--wui-row-line); padding-bottom: 4px; margin-top: 4px; }
.qa-group small { text-transform: none; letter-spacing: 0; font-weight: 600; color: var(--wui-faint); }
.qa-search { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 10px; border-radius: var(--wui-radius); border: 1.5px solid var(--wui-border-strong); background: var(--wui-surface); box-shadow: inset 0 1px 2px rgba(15, 23, 42, .05); }
.qa-search:focus-within { border-color: var(--wui-primary); box-shadow: 0 0 0 3px rgba(37, 99, 235, .15); }
.qa-search > .mdi { font-size: 18px; color: var(--wui-muted); }
.qa-search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font: inherit; font-size: 13px; color: var(--wui-text); }
.qa-search input::placeholder { color: var(--wui-faint); }
.qa-search button { border: 0; background: none; padding: 0; color: var(--wui-faint); cursor: pointer; font-size: 16px; }
.qa-dd { position: relative; }
.qa-dd-menu { position: absolute; right: 0; top: calc(100% + 4px); z-index: 30; min-width: 220px; padding: 4px; border-radius: 8px; border: 1px solid var(--wui-border); background: var(--wui-surface); box-shadow: 0 8px 24px rgba(15, 23, 42, .16); }
.qa-dd-menu button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; border: 0; border-radius: 6px; background: none; font: inherit; font-size: 12px; color: var(--wui-text); cursor: pointer; text-align: left; }
.qa-dd-menu button:hover:not(:disabled) { background: var(--wui-row-hover); }
.qa-dd-menu button:disabled { opacity: .5; cursor: not-allowed; }
.qa-dd-menu b { margin-left: auto; font-variant-numeric: tabular-nums; }
.qa-del { color: var(--wui-danger); }
.qa-del:hover:not(:disabled) { background: #fef2f2 !important; border-color: #fecaca !important; }
.qa-page .wui-body { overflow: hidden; }
/* Tabel mengisi sisa tinggi layar; 10 baris dibagi rata (tinggi seragam, tanpa ruang kosong). */
.qa-page .wui-table-wrap { flex: 1; min-height: 0; overflow-x: auto; overflow-y: hidden; }
.qa-table { height: 100%; }
.qa-table thead tr { height: 36px; }
.qa-table tbody tr { height: 10%; }
.qa-table tbody td { padding-top: 3px; padding-bottom: 3px; white-space: nowrap; vertical-align: middle; }
.qa-table .qa-thumb { width: 34px; height: 34px; }
.qa-pad td { background: var(--wui-surface) !important; }
.qa-pn-line { display: flex; align-items: baseline; gap: 6px; }
.qa-proc { max-width: 140px; overflow: hidden; text-overflow: ellipsis; }
.qa-pager { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.qa-pages { display: flex; align-items: center; gap: 4px; }
.qa-pages button { min-width: 30px; height: 30px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--wui-border); background: var(--wui-surface); color: var(--wui-text-2); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.qa-pages button.on { background: var(--wui-primary); border-color: var(--wui-primary); color: #fff; }
.qa-pages button:disabled { opacity: .4; cursor: not-allowed; }
.qa-gap { padding: 0 4px; color: var(--wui-faint); }
.qa-code-preview { font-size: 12px; color: var(--wui-muted); }
.qa-code-preview b { color: var(--wui-text); }
.qa-links { display: flex; flex-wrap: nowrap; gap: 3px; margin-top: 2px; }
.qa-off td { opacity: .55; }
.qa-warn { margin-left: 3px; color: var(--wui-amber); font-size: 12px; }
.qa-thumb { width: 44px; height: 44px; border-radius: 6px; border: 1px solid var(--wui-border); background: var(--wui-hover-surface); display: grid; place-items: center; overflow: hidden; cursor: pointer; padding: 0; color: var(--wui-faint); font-size: 18px; }
.qa-thumb img { width: 100%; height: 100%; object-fit: cover; }
.qa-thumb--qr { background: #fff; padding: 3px; }
.qa-thumb--qr img { object-fit: contain; }
.qa-modal { width: 620px; }
.qa-x { margin-left: auto; }
.qa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
.qa-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 700; color: var(--wui-muted); }
.qa-grid label b { color: var(--wui-danger); }
.qa-span { grid-column: 1 / -1; }
.qa-textarea { height: 56px; padding: 6px 10px; resize: vertical; }
.qa-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--wui-row-line); }
.qa-detail { width: 720px; }
.qa-detail-body { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.qa-detail-img, .qa-detail-qr { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.qa-detail-img img { width: 100%; max-height: 300px; object-fit: contain; border-radius: 8px; border: 1px solid var(--wui-border); background: var(--wui-hover-surface); }
.qa-detail-noimg { width: 100%; height: 240px; border-radius: 8px; border: 1px dashed var(--wui-border-strong); display: grid; place-items: center; color: var(--wui-faint); font-size: 13px; }
.qa-detail-qr img { width: 240px; height: 240px; background: #fff; padding: 8px; border-radius: 8px; border: 1px solid var(--wui-border); }
.qa-detail-actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.qa-detail-actions a { text-decoration: none; }
.qa-detail-info { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px 14px; margin: 0; padding-top: 12px; border-top: 1px solid var(--wui-row-line); }
.qa-detail-info dt { font-size: 10.5px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--wui-muted); }
.qa-detail-info dd { margin: 2px 0 0; font-size: 12.5px; font-weight: 600; color: var(--wui-text); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.qa-th-act { width: 1%; }
.qa-table tbody tr { cursor: default; }
@media (max-width: 640px) { .qa-detail-info { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.qa-busy { pointer-events: none; opacity: .6; }
@media (max-width: 640px) { .qa-detail-body, .qa-grid { grid-template-columns: 1fr; } }
:root.dark .qa-pn { color: #93c5fd; }
</style>


