<!-- components/welding/mutation/TableBody.vue -->
<template>
  <!-- Spacer atas: mewakili job di atas viewport yang tak dirender (virtualisasi) -->
  <tbody ref="tbodyRef">
    <tr v-if="topSpacerHeight > 0" class="virt-spacer" :style="{ height: topSpacerHeight + 'px' }">
      <td :colspan="totalColCount" class="virt-spacer-cell"></td>
    </tr>
  </tbody>

  <!-- 1 <tbody> per part + v-memo: saat jendela virtual bergeser (scroll), part yang
       sudah tampil TIDAK di-render ulang — hanya part yang baru masuk. Dulu seluruh
       sel yang tampil (±2.000) di-render ulang tiap geser → scroll tersendat.
       renderVer naik bila data/lebar kolom/tgl tersembunyi/libur/plan v2 berubah.
       Key memuat jenis baris: part yang sama bisa ada di FP & WIP sekaligus. -->
  <tbody v-for="{ job, absIdx: jobIdx } in visibleJobs" :key="rowKey(job)" v-memo="[job, jobIdx, renderVer]">
      <template v-for="(desc, descIdx) in descsFor(job)" :key="`${rowKey(job)}-${desc.type}`">
        <tr class="virt-row" :class="getRowClass(desc.type)">
          <!-- ── Merged left columns ─────────────────────── -->
          <td
            v-if="descIdx === 0"
            :rowspan="descsFor(job).length"
            class="body-cell sticky-col col-no merged-cell"
            :style="colStyle('no')"
          >
            {{ jobIdx + 1 }}
          </td>
          <td
            v-if="descIdx === 0"
            :rowspan="descsFor(job).length"
            class="body-cell sticky-col col-kind merged-cell"
            :style="colStyle('kind')"
            :title="isWip(job) ? 'WIP — part setengah jadi (Mutasi WIP)' : 'FP — finish part (Mutasi FP)'"
          >
            <span class="kind-badge" :class="isWip(job) ? 'kind-badge--wip' : 'kind-badge--fp'">{{ isWip(job) ? 'WIP' : 'FP' }}</span>
          </td>
          <!-- PART NO. + JOB NO. (chip) dalam 1 sel — 2026-09-16 -->
          <td
            v-if="descIdx === 0"
            :rowspan="descsFor(job).length"
            class="body-cell sticky-col col-part merged-cell text-left"
            :style="colStyle('partNo')"
            :title="partTitle(job)"
          >
            <div class="part-wrap">
              <span class="cell-overflow part-no-text">
                <span v-if="job.jobNo" class="job-no-inline">{{ job.jobNo }} - </span>{{ job.partNo }}
              </span>
              <span v-if="job.partName" class="cell-overflow part-name-text">{{ job.partName }}</span>
              <span
                v-if="job.masterStatus" class="ms-badge" :class="`ms-badge--${job.masterStatus.code}`"
                :title="job.masterStatus.note" @click.stop
              ><i class="mdi mdi-information-outline"></i>{{ job.masterStatus.label }}</span>
            </div>
          </td>
          <!-- CUSTOMER (Aturan #16): asal MDFO. Bisa >1 customer utk part fisik
               yang sama (mis. ADM + TMMIN) -> ditampilkan digabung " + ".
               MODEL digabung di baris ke-2 (chip) sejak 2026-09-16. -->
          <td
            v-if="descIdx === 0"
            :rowspan="descsFor(job).length"
            class="body-cell sticky-col col-customer merged-cell"
            :style="colStyle('customer')"
            :title="customerTitle(job) + (job.model ? '\nModel: ' + job.model : '')"
          >
            <div class="cust-wrap">
              <span class="cell-overflow cust-name">{{ customerLabel(job) }}</span>
              <span v-if="job.model" class="model-chip">{{ job.model }}</span>
            </div>
          </td>
          <!-- MESIN + mode shift (Aturan #5) — 2026-09-16 -->
          <td
            v-if="descIdx === 0"
            :rowspan="descsFor(job).length"
            class="body-cell sticky-col col-machine merged-cell"
            :style="colStyle('machine')"
          >
            <div class="cust-wrap">
              <span class="cell-overflow machine-text" :title="job.machine ? 'Mesin: ' + job.machine + (job.uph ? ' · ' + job.uph + ' pcs/jam' : '') : 'Mesin belum di-set di master'">
                {{ job.machine || '—' }}
              </span>
              <button
                class="sm-chip"
                :class="'sm-' + (job.shiftMode || 'both')"
                :title="smodeTitle(job.shiftMode)"
                @click.stop="openShiftMode(job, $event)"
              >
                <i class="mdi" :class="smodeIcon(job.shiftMode)" />
                <span>{{ smodeShort(job.shiftMode) }}</span>
              </button>
            </div>
          </td>
          <!-- <td
            v-if="descIdx === 0"
            :rowspan="descsFor(job).length"
            class="body-cell sticky-col col-name merged-cell text-left"
            :style="colStyle('name')"
          >
            <span class="cell-overflow" :title="job.partName">{{ job.partName }}</span>
          </td> -->
          <td
            v-if="descIdx === 0"
            :rowspan="descsFor(job).length"
            class="body-cell sticky-col col-lot merged-cell text-right"
            :style="colStyle('lot')"
          >
            {{ job.qty_kbn }}
          </td>
          <td
            v-if="descIdx === 0"
            :rowspan="descsFor(job).length"
            class="body-cell sticky-col col-stock merged-cell text-right stock-editable-cell"
            :style="colStyle('stock')"
            tabindex="0"
            :title="initialStockTitle(job)"
            @click="emitOpenStock(job)"
            @keydown.enter.prevent="emitOpenStock(job)"
          >
            <span class="stock-val-wrap">
              <span>{{ job.initialStock }}</span>
              <i class="mdi mdi-pencil-outline stock-edit-icon" />
              <button
                v-if="job.initialStockLocked"
                type="button"
                class="stock-reset-btn"
                title="Reset ke stok penutupan bulan lalu (lepas kunci manual)"
                @click.stop="emitResetStock(job)"
              >
                <i class="mdi mdi-restore" />
              </button>
            </span>
          </td>

          <!-- Description label -->
          <td class="body-cell sticky-col col-desc" :class="getDescClass(desc.type)" :style="colStyle('desc')">
            {{ descLabel(desc) }}
          </td>

          <!-- ── FORECAST — merged colspan=2 ───────────── -->
          <template v-if="desc.type === 'FORECAST'">
            <template v-for="day in maxDays" :key="`${job.jobNo}-FORECAST-${day}`">
              <td
                v-if="isDayVisible(day)"
                colspan="2"
                class="body-cell data-cell merged-day-cell forecast-cell"
                :data-focus="isFocusDay(day) || null" :data-past="isPastDay(day) || null"
                :class="(custClickable(job)) || (isWip(job) && desc.dates[day]?.night) ? 'forecast-cell--clickable' : ''"
                :data-holiday="isHoliday(day) || null" :style="dayColStyle(day, true)"
                :title="forecastTitle(job, desc.dates[day], day)"
                @click="custClickable(job) ? emitCustomerClick(job, day) : (isWip(job) && desc.dates[day]?.night ? emitForecastClick(job, day) : null)"
              >
                {{ desc.dates[day]?.night || '' }}
                <!-- Pita miring nama libur: aliran kata berulang (kata utuh) menembus blok job;
                     tiap job dapat potongan berikutnya (lihat holidayChunk). -->
                <span v-if="isHoliday(day)" class="holiday-ribbon" :title="'Libur nasional: ' + holidayNote(day)">
                  {{ holidayChunk(day, jobIdx) }}
                </span>
              </td>
              <td v-if="!isDayVisible(day)" colspan="2" class="body-cell collapsed-day-cell" />
            </template>
          </template>

          <!-- ── PCS_PER_DAY — merged colspan=2 ────────── -->
          <template v-else-if="desc.type === 'PCS_PER_DAY'">
            <template v-for="day in maxDays" :key="`${job.jobNo}-PCS_PER_DAY-${day}`">
              <td
                v-if="isDayVisible(day)"
                colspan="2"
                class="body-cell data-cell merged-day-cell pcs-per-day-cell"
                :data-focus="isFocusDay(day) || null" :data-past="isPastDay(day) || null"
                :class="custClickable(job) ? 'forecast-cell--clickable' : ''"
                :data-holiday="isHoliday(day) || null" :style="dayColStyle(day, true)"
                :title="custClickable(job) ? pcsTitle(desc.dates[day], day) : ''"
                @click="custClickable(job) ? emitCustomerClick(job, day) : null"
              >
                {{ desc.dates[day]?.day ? (desc.dates[day].day as number).toFixed(2) : '' }}
              </td>
              <td v-if="!isDayVisible(day)" colspan="2" class="body-cell collapsed-day-cell" />
            </template>
          </template>

          <!-- ── PLAN — D/N terpisah + clickable + lock icon ── -->
          <template v-else-if="desc.type === 'PLAN'">
            <template v-for="day in maxDays" :key="`${job.jobNo}-PLAN-${day}`">
              <template v-if="isDayVisible(day)">
                <!-- Day cell -->
                <td
                  class="body-cell data-cell day-cell plan-cell"
                  :data-focus="isFocusDay(day) || null" :data-past="isPastDay(day) || null"
                  :class="[
                    getCellClass(desc.type, desc.dates[day]?.day, job.qty_kbn),
                    desc.dates[day]?.is_dn === false ? 'plan-estimated' : '',
                    desc.dates[day]?.lock_day ? 'plan-cell--locked' : 'plan-cell--editable',
                    isOffDay(job, day, 'day') ? 'plan-cell--off' : '',
                    (!isOffDay(job, day, 'day') && bufferInfo(job, day)) ? 'plan-cell--buffer' : ''
                  ]"
                  :data-holiday="isHoliday(day) || null" :style="dayColStyle(day)"
                  :title="isOffDay(job, day, 'day') ? 'Mesin OFF — tidak ada produksi' : (bufferInfo(job, day) ? bufferTitle(job, day) : planCellTitle(desc.dates[day], 'day'))"
                  @click="isOffDay(job, day, 'day') ? undefined : emitPlanClick(job, day, desc.dates[day])"
                >
                  <span class="plan-cell-inner">
                    <template v-if="isOffDay(job, day, 'day')">OFF PRODUKSI</template>
                    <template v-else>
                      <i v-if="desc.dates[day]?.lock_day" class="mdi mdi-lock plan-lock-icon" />
                      <span :class="desc.dates[day]?.is_dn === false ? 'text-gray' : ''">
                        {{ formatCell(desc.type, planVal(desc.dates[day], 'day')) }}
                      </span>
                    </template>
                  </span>
                </td>
                <!-- Night cell -->
                <td
                  class="body-cell data-cell night-cell plan-cell"
                  :data-focus="isFocusDay(day) || null" :data-past="isPastDay(day) || null"
                  :class="[
                    getCellClass(desc.type, desc.dates[day]?.night, job.qty_kbn),
                    desc.dates[day]?.is_dn === false ? 'plan-estimated' : '',
                    desc.dates[day]?.lock_night ? 'plan-cell--locked' : 'plan-cell--editable',
                    isOffDay(job, day, 'night') ? 'plan-cell--off' : '',
                    (!isOffDay(job, day, 'night') && bufferInfo(job, day)) ? 'plan-cell--buffer' : ''
                  ]"
                  :data-holiday="isHoliday(day) || null" :style="dayColStyle(day)"
                  :title="isOffDay(job, day, 'night') ? 'Mesin OFF — tidak ada produksi' : (bufferInfo(job, day) ? bufferTitle(job, day) : planCellTitle(desc.dates[day], 'night'))"
                  @click="isOffDay(job, day, 'night') ? undefined : emitPlanClick(job, day, desc.dates[day])"
                >
                  <span class="plan-cell-inner">
                    <template v-if="isOffDay(job, day, 'night')">OFF PRODUKSI</template>
                    <template v-else>
                      <i v-if="desc.dates[day]?.lock_night" class="mdi mdi-lock plan-lock-icon" />
                      <span :class="desc.dates[day]?.is_dn === false ? 'text-gray' : ''">
                        {{ formatCell(desc.type, planVal(desc.dates[day], 'night')) }}
                      </span>
                    </template>
                  </span>
                </td>
              </template>
              <td v-if="!isDayVisible(day)" colspan="2" class="body-cell collapsed-day-cell" />
            </template>
          </template>

          <!-- ── STOCK — D/N terpisah + clickable + adjust indicator ── -->
          <template v-else-if="desc.type === 'STOCK'">
            <template v-for="day in maxDays" :key="`${job.jobNo}-STOCK-${day}`">
              <template v-if="isDayVisible(day)">
                <td
                  class="body-cell data-cell day-cell stock-cell"
                  :data-focus="isFocusDay(day) || null" :data-past="isPastDay(day) || null"
                  :class="[
                    getCellClass(desc.type, desc.dates[day]?.day, job.qty_kbn),
                    desc.dates[day]?.day === null ? 'cell-null' : '',
                    desc.dates[day]?.stock_adjust_day ? 'stock-adjusted' : '',
                    desc.dates[day]?.projected_day ? 'cell-projected' : '',
                  ]"
                  :data-holiday="isHoliday(day) || null" :style="dayColStyle(day)"
                  :title="stockCellTitle(desc.dates[day], 'day')"
                  @click="emitStockClick(job, day, 'day', desc.dates[day])"
                >
                  <span class="stock-cell-inner">
                    <i v-if="desc.dates[day]?.stock_adjust_day" class="mdi mdi-pencil-circle stock-adj-icon" />
                    {{ formatCell(desc.type, desc.dates[day]?.day) }}
                  </span>
                </td>
                <td
                  class="body-cell data-cell night-cell stock-cell"
                  :data-focus="isFocusDay(day) || null" :data-past="isPastDay(day) || null"
                  :class="[
                    getCellClass(desc.type, desc.dates[day]?.night, job.qty_kbn),
                    desc.dates[day]?.night === null ? 'cell-null' : '',
                    desc.dates[day]?.stock_adjust_night ? 'stock-adjusted' : '',
                    desc.dates[day]?.projected_night ? 'cell-projected' : '',
                  ]"
                  :data-holiday="isHoliday(day) || null" :style="dayColStyle(day)"
                  :title="stockCellTitle(desc.dates[day], 'night')"
                  @click="emitStockClick(job, day, 'night', desc.dates[day])"
                >
                  <span class="stock-cell-inner">
                    <i v-if="desc.dates[day]?.stock_adjust_night" class="mdi mdi-pencil-circle stock-adj-icon" />
                    {{ formatCell(desc.type, desc.dates[day]?.night) }}
                  </span>
                </td>
              </template>
              <td v-if="!isDayVisible(day)" colspan="2" class="body-cell collapsed-day-cell" />
            </template>
          </template>

          <!-- ── Semua lainnya: D/N terpisah ────────────── -->
          <template v-else>
            <template v-for="day in maxDays" :key="`${job.jobNo}-${desc.type}-${day}`">
              <template v-if="isDayVisible(day)">
                <td
                  class="body-cell data-cell day-cell"
                  :data-focus="isFocusDay(day) || null" :data-past="isPastDay(day) || null"
                  :class="[
                    getCellClass(desc.type, desc.dates[day]?.day, job.qty_kbn, job),
                    desc.dates[day]?.day === null ? 'cell-null' : '',
                    desc.dates[day]?.projected_day ? 'cell-projected' : '',
                    (desc.type === 'ACTUAL' && isOffDay(job, day, 'day')) ? 'plan-cell--off' : '',
                    isDnEditable(desc.type, job) ? dnCellClass(desc.dates[day], 'day') : ''
                  ]"
                  :data-holiday="isHoliday(day) || null" :style="dayColStyle(day)"
                  :title="desc.type === 'STRENGTH' ? (job.safetyNote || strengthTitle(job)) : ((desc.type === 'ACTUAL' && isOffDay(job, day, 'day')) ? 'Mesin OFF — tidak ada produksi' : (desc.type === 'DELIVERY' ? dnCellTitle(job, desc.dates[day], 'day') : ''))"
                  @click="isDnEditable(desc.type, job) ? emitDnClick(job, day, 'day', desc.dates[day]) : null"
                >
                  <template v-if="desc.type === 'ACTUAL' && isOffDay(job, day, 'day')">OFF PRODUKSI</template>
                  <template v-else>{{ formatCell(desc.type, desc.dates[day]?.day) }}</template>
                </td>
                <td
                  class="body-cell data-cell night-cell"
                  :data-focus="isFocusDay(day) || null" :data-past="isPastDay(day) || null"
                  :class="[
                    getCellClass(desc.type, desc.dates[day]?.night, job.qty_kbn, job),
                    desc.dates[day]?.night === null ? 'cell-null' : '',
                    desc.dates[day]?.projected_night ? 'cell-projected' : '',
                    (desc.type === 'ACTUAL' && isOffDay(job, day, 'night')) ? 'plan-cell--off' : '',
                    isDnEditable(desc.type, job) ? dnCellClass(desc.dates[day], 'night') : ''
                  ]"
                  :data-holiday="isHoliday(day) || null" :style="dayColStyle(day)"
                  :title="desc.type === 'STRENGTH' ? (job.safetyNote || strengthTitle(job)) : ((desc.type === 'ACTUAL' && isOffDay(job, day, 'night')) ? 'Mesin OFF — tidak ada produksi' : (desc.type === 'DELIVERY' ? dnCellTitle(job, desc.dates[day], 'night') : ''))"
                  @click="isDnEditable(desc.type, job) ? emitDnClick(job, day, 'night', desc.dates[day]) : null"
                >
                  <template v-if="desc.type === 'ACTUAL' && isOffDay(job, day, 'night')">OFF PRODUKSI</template>
                  <template v-else>{{ formatCell(desc.type, desc.dates[day]?.night) }}</template>
                </td>
              </template>
              <td v-if="!isDayVisible(day)" colspan="2" class="body-cell collapsed-day-cell" />
            </template>
          </template>

          <!-- Total -->
          <td class="body-cell sticky-right total-cell" :class="getDescClass(desc.type)">
            {{ formatTotal(desc.type, desc.total) }}
          </td>
        </tr>
      </template>
  </tbody>

  <!-- Spacer bawah: mewakili job di bawah viewport yang tak dirender (virtualisasi) -->
  <tbody>
    <tr v-if="bottomSpacerHeight > 0" class="virt-spacer" :style="{ height: bottomSpacerHeight + 'px' }">
      <td :colspan="totalColCount" class="virt-spacer-cell"></td>
    </tr>
  </tbody>

    <!-- Shift-mode popover (Aturan #5) — teleport ke body agar valid di luar tabel -->
    <Teleport to="body">
      <div v-if="sm.active" class="sm-pop">
        <div class="sm-overlay" @click="sm.active = false"></div>
        <div class="sm-card" :style="{ top: sm.y + 'px', left: sm.x + 'px' }">
          <div class="sm-title">
            <i class="mdi mdi-swap-horizontal" />
            <span>Mode Shift Produksi</span>
            <span class="sm-part">{{ sm.part }}</span>
          </div>
          <div class="sm-modes">
            <button v-for="m in (['both','day','night'] as const)" :key="m"
                    class="sm-mbtn" :class="[{ on: sm.mode === m }, 'sm-mbtn--' + m]" @click="sm.mode = m">
              <i class="mdi" :class="smodeIcon(m)" />
              <span class="sm-mlbl">{{ smodeLabel(m) }}</span>
              <span class="sm-mdesc">{{ smodeDesc(m) }}</span>
            </button>
          </div>
          <div class="sm-scope">
            <span class="sm-slbl">Berlaku untuk</span>
            <div class="sm-sgrp">
              <button class="sm-sbtn" :class="{ on: sm.scope==='month' }" @click="sm.scope='month'">
                <i class="mdi mdi-calendar-month-outline" /> Seluruh bulan
              </button>
              <button class="sm-sbtn" :class="{ on: sm.scope==='date' }" @click="sm.scope='date'">
                <i class="mdi mdi-calendar-today" /> Hari ini (tgl {{ todayDate }})
              </button>
            </div>
          </div>
          <p class="sm-hint">
            <i class="mdi mdi-information-outline" />
            DN shift yang dimatikan tetap dihitung — plan otomatis pindah ke shift aktif. Plan dihitung ulang setelah simpan.
          </p>
          <div class="sm-btns">
            <button class="sm-no" @click="sm.active = false">Batal</button>
            <button class="sm-ok" :disabled="sm.mode === sm.orig && sm.scope === 'month'" @click="commitShiftMode">
              <i class="mdi mdi-check" /> Simpan
            </button>
          </div>
        </div>
      </div>
    </Teleport>
</template>

<script setup lang="ts">
import { useActiveShift } from '@/composables/useActiveShift';
import { ref, shallowRef, reactive, computed, nextTick, onMounted, onUnmounted, watch } from 'vue';
import type { Job, DateData, MutasiKind } from '@/types/Public/Welding/planning';
import { useTableColumns, LEFT_COLUMNS } from '@/composables/useTableColumns';

interface Props {
  jobs: Job[];
  maxDays?: number;
  planningV2?: boolean;
  // Libur nasional {tanggal: nama} — sel hari itu diarsir + pita label miring.
  holidays?: Record<string | number, string>;
  currentYear?: number;
  currentMonth?: number;
}

// ── Perilaku per jenis baris (FP & WIP dalam 1 tabel) ─────────────
// FP : sel MDFO / DN / PCS-DAY → rincian per customer (part gabungan);
//      band STRENGTH 12–20 jam.
// WIP: sel MDFO → detail parent (mini-mutasi); band STRENGTH 8–12 jam
//      (atau safety dinamis per-WIP dari backend).
const isWip = (job: Job) => job.kind === 'WIP';
const kindOf = (job: Job): MutasiKind => job.kind ?? 'FP';
const rowKey = (job: Job) => `${kindOf(job)}-${job.partNo}`;
const custClickable = (job: Job) => !isWip(job) && isMultiCust(job);
const STRENGTH_BAND: Record<MutasiKind, [number, number]> = { FP: [12, 20], WIP: [8, 12] };
// FP: band per part dari master Strength Standard (backend, strengthSource = 'master').
function strengthTitle(job: Job): string {
  if (isWip(job)) return '';
  const lo = job.strengthSafeMin ?? STRENGTH_BAND.FP[0];
  const hi = job.strengthSafeMax ?? STRENGTH_BAND.FP[1];
  return `Standar strength ${lo}–${hi} jam (${job.strengthSource === 'master' ? 'master Strength Standard' : 'default'})`;
}

function isHoliday(day: number): boolean {
  return !!props.holidays && props.holidays[day] != null
}
function holidayNote(day: number): string {
  return (props.holidays && props.holidays[day]) || 'LIBUR'
}

// Aliran kata libur yang berulang & UTUH per kata, dibagi ke blok job berurutan:
// job ke-i menerima kata-kata berikutnya setelah job ke-(i-1) berhenti, sehingga
// terbaca menerus dari atas ke bawah kolom (mis. "HARI KEMERDEKAAN REPUBLIK" |
// "INDONESIA KE-81 • HARI KEMERDEKAAN" | ...). Lebar diukur canvas supaya kata
// tidak terpotong di ujung pita (RIBBON_PX = panjang pita, lihat CSS).
const RIBBON_PX = 196
const RIBBON_FONT = '800 12px Poppins, system-ui, sans-serif'
const RIBBON_LS = 1.2   // letter-spacing px/karakter (ikut CSS)
let _measureCtx: CanvasRenderingContext2D | null = null
function measure(t: string): number {
  if (!_measureCtx) { const c = document.createElement('canvas'); _measureCtx = c.getContext('2d') }
  if (!_measureCtx) return t.length * 8.5
  _measureCtx.font = RIBBON_FONT
  return _measureCtx.measureText(t).width + t.length * RIBBON_LS
}
const holidayChunks = computed<Record<number, string[]>>(() => {
  const out: Record<number, string[]> = {}
  if (!props.holidays) return out
  const n = props.jobs.length
  for (const k of Object.keys(props.holidays)) {
    const day = Number(k)
    const words = holidayNote(day).toUpperCase().split(/\s+/).filter(Boolean)
    if (!words.length) continue
    const stream = [...words, '•']          // pemisah antar pengulangan
    let pos = 0
    const chunks: string[] = []
    for (let i = 0; i < n; i++) {
      let line = ''
      let guard = 0
      while (guard++ < 50) {
        const w = stream[pos % stream.length]
        const cand = line ? line + ' ' + w : w
        if (measure(cand) > RIBBON_PX) break
        line = cand; pos++
      }
      if (!line) { line = stream[pos % stream.length]; pos++ }   // kata tunggal lebih panjang dari pita
      chunks.push(line)
    }
    out[day] = chunks
  }
  return out
})
function holidayChunk(day: number, jobIdx: number): string {
  return holidayChunks.value[day]?.[jobIdx] ?? holidayNote(day)
}

// Baris yang tampil: sembunyikan PLAN SECONDARY saat v2 OFF (juga dipakai utk rowspan).
function descsFor(job: Job): any[] {
  const ds = job.descriptions as any[];
  return props.planningV2 ? ds : ds.filter((d) => d.type !== 'PLAN_SECONDARY');
}
// Label & nilai PLAN: saat v2 → "PLAN PRIMARY" + nilai primary (DN).
function descLabel(desc: any): string {
  if (props.planningV2 && desc.type === 'PLAN') return 'PLAN PRIMARY';
  return desc.label;
}
function planVal(cell: any, shift: 'day' | 'night'): number | undefined {
  if (!cell) return undefined;
  if (props.planningV2) {
    const p = shift === 'day' ? cell.pri_day : cell.pri_night;
    if (p !== null && p !== undefined) return p;
  }
  return shift === 'day' ? cell.day : cell.night;
}

const props = withDefaults(defineProps<Props>(), { maxDays: 28 });

// Tanggal shift aktif (Night 00:00–07:14 = tanggal kemarin): angka sel di-bold.
const { isActiveDay, isPastDay: pastDay } = useActiveShift();
const isFocusDay = (day: number) =>
  !!props.currentYear && !!props.currentMonth && isActiveDay(day, props.currentYear, props.currentMonth);
const isPastDay = (day: number) =>
  !!props.currentYear && !!props.currentMonth && pastDay(day, props.currentYear, props.currentMonth);

const emit = defineEmits<{
  planCellClick:      [data: { kind: MutasiKind; partNo: string; partName: string; tanggal: number; dateData: DateData }];
  initialStockOpen:   [job: Job];
  customerCellClick:  [data: { job: Job; tanggal: number }];
  dnCellClick:        [data: { job: Job; tanggal: number; shift: 'day' | 'night'; dateData: DateData }];
  initialStockReset:  [data: { kind: MutasiKind; partNo: string }];
  stockCellClick:     [data: {
    kind: MutasiKind; partNo: string; partName: string; tanggal: number; shift: 'day' | 'night'; currentStock: number;
    wasAdjusted: boolean; lastAdjustBy: string | null; lastAdjustAt: string | null; lastAdjustNote: string | null;
  }];
  shiftModeChange:    [data: { kind: MutasiKind; partNo: string; mode: 'both' | 'day' | 'night'; scope: 'month' | 'date' }];
  forecastCellClick:  [data: { partNo: string; partName: string; tanggal: number }];
}>();

// ── Rincian per customer (part gabungan, Aturan #16) ─────────────
function isMultiCust(job: Job): boolean {
  return (job.mdfoCustomers?.length ?? 0) > 1
}
function emitCustomerClick(job: Job, tanggal: number) {
  emit('customerCellClick', { job, tanggal })
}

// ── DN (ACT. DELIVERY) — adjust manual per sel (2026-09-25), FP saja ──
// Rincian per customer DN kini tampil di modal adjust DN (bukan modal customer).
function isDnEditable(type: string, job: Job): boolean {
  return type === 'DELIVERY' && !isWip(job)
}
function dnAdj(dateData: DateData | undefined, shift: 'day' | 'night') {
  return shift === 'day' ? dateData?.adj_day : dateData?.adj_night
}
function dnCellClass(dateData: DateData | undefined, shift: 'day' | 'night'): string {
  const adj = dnAdj(dateData, shift)
  // Manual sedang dipakai = aktif; tersimpan tapi DN sistem yang tampil = pasif.
  const active = adj && (adj.mode === 'manual' || (adj.mode === 'auto' && !adj.has_do))
  return 'dn-cell--edit' + (adj ? (active ? ' dn-cell--adj' : ' dn-cell--adj-idle') : '')
}
const DN_MODE_LABEL: Record<string, string> = { auto: 'Otomatis', manual: 'Manual', system: 'Sistem' }
function dnCellTitle(job: Job, dateData: DateData | undefined, shift: 'day' | 'night'): string {
  const val   = Number((shift === 'day' ? dateData?.day : dateData?.night) ?? 0)
  const doQty = Number((shift === 'day' ? dateData?.do_day : dateData?.do_night) ?? 0)
  const lines = [`DN ${shift === 'day' ? 'Day' : 'Night'}: ${val}`]
  const adj = dnAdj(dateData, shift)
  if (adj) {
    lines.push(`Manual: ${adj.manual_qty} (mode ${DN_MODE_LABEL[adj.mode] ?? adj.mode})`,
      `Sistem: ${adj.system_qty ?? '-'}${adj.has_do ? ' · sudah ada DO' : ' · masih SO'}`)
  } else if (val) {
    lines.push(doQty >= val ? 'Sumber: DO nyata' : doQty > 0 ? `Sumber: DO ${doQty} + SO ${val - doQty}` : 'Sumber: SO (belum ada DO)')
  }
  const bc = (dateData as any)?.by_customer as Record<string, { day: number; night: number }> | undefined
  if (bc) for (const [c, v] of Object.entries(bc)) { const q = shift === 'day' ? v.day : v.night; if (q) lines.push(`· ${c}: ${q}`) }
  if (!isWip(job)) lines.push('Klik untuk adjust DN')
  return lines.join('\n')
}
function emitDnClick(job: Job, tanggal: number, shift: 'day' | 'night', dateData: DateData | undefined) {
  emit('dnCellClick', { job, tanggal, shift, dateData: dateData ?? {} })
}
function pcsTitle(dateData: DateData | undefined, day: number): string {
  const bc = (dateData as any)?.by_customer as Record<string, number> | undefined
  const lines: string[] = []
  if (bc) for (const [c, v] of Object.entries(bc)) lines.push(`· ${c}: ${Number(v).toFixed(2)}`)
  return (lines.length ? `PCS/DAY tgl ${day} per customer:\n${lines.join('\n')}\n` : '') + 'Klik untuk rincian per customer'
}

function emitForecastClick(job: Job, tanggal: number) {
  emit('forecastCellClick', { partNo: job.partNo, partName: job.partName, tanggal });
}

// ── Shift mode (Aturan #5) ────────────────────────────────────
// Label ramah pengguna (Indonesia) — chip di kolom JOB NO + popover.
// Baris 1: "JOB - PART" (tanpa job → part saja); baris 2: part name.
function partTitle(job: Job): string {
  const l = [(job.jobNo ? job.jobNo + ' - ' : '') + job.partNo]
  if (job.partName) l.push(job.partName)
  return l.join('\n')
}

const smodeLabel = (m?: string) => m === 'day' ? 'Siang saja' : m === 'night' ? 'Malam saja' : '2 Shift';
const smodeShort = (m?: string) => m === 'day' ? 'Siang' : m === 'night' ? 'Malam' : '2 Shift';
const smodeIcon  = (m?: string) => m === 'day' ? 'mdi-weather-sunny' : m === 'night' ? 'mdi-weather-night' : 'mdi-theme-light-dark';
const smodeDesc  = (m?: string) =>
  m === 'day'   ? 'Produksi hanya shift siang'
  : m === 'night' ? 'Produksi hanya shift malam'
  : 'Produksi siang & malam (normal)';
const smodeTitle = (m?: string) => `Mode shift: ${smodeLabel(m)}\n${smodeDesc(m)}\nKlik untuk ubah`;
const todayDate  = new Date().getDate();
const sm = reactive({
  active: false, x: 0, y: 0,
  kind: 'FP' as MutasiKind, part: '', mode: 'both' as 'both' | 'day' | 'night', orig: 'both' as 'both' | 'day' | 'night',
  scope: 'month' as 'month' | 'date',
});
function openShiftMode(job: Job, e: MouseEvent) {
  sm.active = true;
  sm.kind = kindOf(job);
  sm.part = job.partNo;
  sm.mode = (job.shiftMode || 'both') as 'both' | 'day' | 'night';
  sm.orig = sm.mode;
  sm.scope = 'month';
  sm.x = Math.min(e.clientX, window.innerWidth - 300);
  sm.y = Math.min(e.clientY + 8, window.innerHeight - 260);
}
function commitShiftMode() {
  if (!sm.active) return;
  emit('shiftModeChange', { kind: sm.kind, partNo: sm.part, mode: sm.mode, scope: sm.scope });
  sm.active = false;
}

const { leftWidths, dateWidths, stickyOffsets, isDayVisible, hiddenDays } = useTableColumns(props.maxDays);

// Versi render utk v-memo per part (lihat template). Naik bila apa pun yang dibaca
// baris berubah selain identitas job: isi data (in-place, mis. lock / stok), plan v2,
// jumlah hari, libur, lebar kolom, tanggal tersembunyi. Deep watch hanya jalan saat
// ada perubahan — BUKAN saat scroll.
const renderVer = ref(0);
watch(
  () => [props.jobs, props.planningV2, props.maxDays, props.holidays, leftWidths.value, dateWidths.value, stickyOffsets.value, hiddenDays.value],
  () => { renderVer.value++; },
  { deep: true },
);

// ══════════════════════════════════════════════════════════════════
// VIRTUALISASI BARIS (windowing per JOB) — jaga DOM tetap kecil walau
// jobs banyak (puluhan/ratusan part × 8-9 baris deskripsi), supaya tak
// berat di device spek rendah manapun. Cuma render job yang dekat
// viewport (+ overscan); job lain diwakili spacer <tr> kosong yang
// tingginya = jumlah baris asli × tinggi baris, supaya scrollbar &
// posisi scroll tetap benar. rowspan (kolom kiri) aman karena tiap job
// SELALU dirender utuh (tak pernah dipotong di tengah).
// ══════════════════════════════════════════════════════════════════
const tbodyRef  = ref<HTMLTableSectionElement | null>(null);
const scrollTop = ref(0);
const viewportH = ref(1000);   // default generous sebelum diukur, hindari kedip kosong
const rowH      = ref(21);     // default estimasi, diukur ulang setelah mount
// PENTING: scrollEl WAJIB reactive (shallowRef, bukan variabel `let` biasa) —
// computed startIdx/endIdx membaca nilainya utk keputusan awal (fallback
// render-semua sebelum scroll container ketemu). Kalau bukan ref, Vue tak
// tahu harus recompute saat onMounted mengisinya belakangan (dependency tak
// ke-track), computed permanen "nyangkut" di hasil pertama (render semua job).
const scrollElRef = shallowRef<HTMLElement | null>(null);

// 800px: cadangan baris di atas/bawah layar supaya scroll cepat tak sempat memperlihatkan
// spacer kosong. Murah sejak v-memo — geser jendela hanya me-render part yang baru masuk.
const OVERSCAN_PX = 400;

const jobRowCounts = computed(() => props.jobs.map(j => descsFor(j).length));
const prefixRows = computed(() => {
  const arr: number[] = [0];
  for (const c of jobRowCounts.value) arr.push(arr[arr.length - 1] + c);
  return arr; // arr[i] = total baris SEBELUM job ke-i; arr[last] = total baris
});
const totalRows = computed(() => prefixRows.value[prefixRows.value.length - 1] ?? 0);

function findStartIndex(rowOffset: number): number {
  const pr = prefixRows.value;
  for (let i = 0; i < pr.length - 1; i++) if (pr[i + 1] > rowOffset) return i;
  return Math.max(0, pr.length - 2);
}
function findEndIndexExclusive(rowOffset: number): number {
  const pr = prefixRows.value;
  for (let i = 0; i < pr.length - 1; i++) if (pr[i] >= rowOffset) return i;
  return Math.max(0, pr.length - 1);
}

const startIdx = computed(() => {
  if (!scrollElRef.value) return 0; // fallback: belum ketemu scroll container → render semua
  const rowOffset = Math.max(0, scrollTop.value - OVERSCAN_PX) / rowH.value;
  return findStartIndex(rowOffset);
});
const endIdx = computed(() => {
  if (!scrollElRef.value) return props.jobs.length; // fallback: render semua
  const rowOffset = (scrollTop.value + viewportH.value + OVERSCAN_PX) / rowH.value;
  return findEndIndexExclusive(rowOffset);
});

const visibleJobs = computed(() =>
  props.jobs.slice(startIdx.value, endIdx.value).map((job, i) => ({ job, absIdx: startIdx.value + i }))
);

const topSpacerHeight    = computed(() => (prefixRows.value[startIdx.value] ?? 0) * rowH.value);
const bottomSpacerHeight = computed(() => (totalRows.value - (prefixRows.value[endIdx.value] ?? totalRows.value)) * rowH.value);

const totalColCount = computed(() => {
  const leftCols = LEFT_COLUMNS.length; // termasuk kolom DESC
  let visibleDays = 0;
  for (let d = 1; d <= props.maxDays; d++) if (isDayVisible(d)) visibleDays++;
  return leftCols + visibleDays * 2 + (props.maxDays - visibleDays) * 2 + 1; // hidden = colspan 2 sempit, +1 Total
});

// Langsung (tanpa requestAnimationFrame): event scroll sudah maks 1x per frame dan Vue
// menggabung render per microtask. rAF menunda 1 frame (spacer kosong sempat tergambar)
// dan tidak jalan saat tab tersembunyi → jendela virtual bisa tertinggal.
function onScroll() {
  if (scrollElRef.value) scrollTop.value = scrollElRef.value.scrollTop;
}
function onResize() {
  if (scrollElRef.value) viewportH.value = scrollElRef.value.clientHeight;
}
function measureRowHeight() {
  const firstRow = tbodyRef.value?.closest('table')?.querySelector('tr.virt-row') as HTMLElement | null;
  const h = firstRow?.getBoundingClientRect().height;
  if (h && h > 0) rowH.value = h;
}

onMounted(() => {
  const el = (tbodyRef.value?.closest('.table-wrapper') as HTMLElement) || null;
  if (el) {
    viewportH.value = el.clientHeight;
    scrollTop.value = el.scrollTop;
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
  }
  scrollElRef.value = el; // set TERAKHIR — baru setelah listener terpasang & nilai awal diisi
  nextTick(measureRowHeight);
});
onUnmounted(() => {
  scrollElRef.value?.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onResize);
});
// Data ganti (mis. ganti sheet/area) → ukuran baris bisa geser dikit, ukur ulang.
watch(() => props.jobs, () => nextTick(measureRowHeight));

// ── Initial stock — edit lewat MODAL (2026-09-16) ─────────────
// Inline edit ala Excel dihapus; klik sel / Enter membuka InitialStockModal
// (ditangani di mutasi-unified.vue) supaya konfirmasi & info kunci jelas.
function emitOpenStock(job: Job) {
  emit('initialStockOpen', job)
}

function emitResetStock(job: Job) {
  emit('initialStockReset', { kind: kindOf(job), partNo: job.partNo })
}

// Tooltip kontekstual untuk sel initial stock
function initialStockTitle(job: Job): string {
  if (job.initialStockLocked) {
    const by = job.initialStockBy ? ` oleh ${job.initialStockBy}` : ''
    const at = job.initialStockAt ? ` · ${job.initialStockAt.slice(0, 16).replace('T', ' ')}` : ''
    return `🔒 Initial stock dikunci manual${by}${at}\nKlik untuk edit · tombol ↺ untuk reset ke stok bulan lalu`
  }
  return 'Initial stock (ikut stok penutupan bulan lalu)\nKlik untuk edit'
}

// ── CUSTOMER & rincian MDFO (Aturan #16) ──────────────────────
// Satu part fisik bisa menerima forecast dari beberapa customer sekaligus
// (kode MDFO base = ADM/MMKI/FTI/dst, kode berakhiran -26/-E26/-28 = TMMIN).
function customerLabel(job: Job): string {
  const cs = job.mdfoCustomers ?? []
  if (!cs.length) return '—'
  return cs.length === 1 ? cs[0] : cs.join(' + ')
}

function customerTitle(job: Job): string {
  const cs = job.mdfoCustomers ?? []
  if (!cs.length) return 'Tidak ada data MDFO bulan ini & master customer kosong'
  // customerSource 'master' = fallback dari ms_welding (MDFO bulan ini kosong)
  if (job.customerSource === 'master') {
    return `Customer dari MASTER (MDFO bulan ini kosong): ${cs.join(', ')}`
  }
  return cs.length === 1
    ? `Customer MDFO: ${cs[0]}`
    : `MDFO gabungan ${cs.length} customer:\n· ${cs.join('\n· ')}`
}

// Tooltip sel MDFO: rincian per customer + petunjuk klik (kalau bisa diklik).
function forecastTitle(job: Job, dateData: DateData | undefined, day: number): string {
  const lines: string[] = []
  const bc = dateData?.by_customer
  if (bc && Object.keys(bc).length) {
    const total = Object.values(bc).reduce((s, v) => s + (Number(v) || 0), 0)
    lines.push(`MDFO tgl ${day}: ${fmtNum(total)} pcs`)
    for (const [cust, qty] of Object.entries(bc)) {
      lines.push(`· ${cust}: ${fmtNum(Number(qty) || 0)}`)
    }
  }
  if (isWip(job) && dateData?.night) {
    lines.push(lines.length ? '' : '', 'Klik untuk lihat detail parent (mini-mutasi)')
  }
  return lines.join('\n').trim()
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n)
}

// ── Emit helpers ──────────────────────────────────────────────
function emitPlanClick(job: Job, tanggal: number, dateData: DateData | undefined) {
  emit('planCellClick', {
    kind: kindOf(job),
    partNo: job.partNo,
    partName: job.partName,
    tanggal,
    dateData: dateData ?? {}
  });
}

function emitStockClick(job: Job, tanggal: number, shift: 'day' | 'night', dateData: DateData | undefined) {
  const currentStock = shift === 'day'
    ? Number(dateData?.day ?? 0)
    : Number(dateData?.night ?? 0)
  const wasAdjusted = shift === 'day'
    ? !!dateData?.stock_adjust_day
    : !!dateData?.stock_adjust_night
  emit('stockCellClick', {
    kind:           kindOf(job),
    partNo:         job.partNo,
    partName:       job.partName,
    tanggal,
    shift,
    currentStock,
    wasAdjusted,
    lastAdjustBy:   dateData?.stock_adjust_by   ?? null,
    lastAdjustAt:   dateData?.stock_adjust_at   ?? null,
    lastAdjustNote: dateData?.stock_adjust_note ?? null,
  });
}

// ── Tooltip untuk STOCK cells ─────────────────────────────────
function stockCellTitle(dateData: DateData | undefined, shift: 'day' | 'night'): string {
  const isAdj = shift === 'day' ? dateData?.stock_adjust_day : dateData?.stock_adjust_night
  if (!isAdj) return 'Klik untuk koreksi stok aktual'
  const by   = dateData?.stock_adjust_by   ? ` oleh ${dateData.stock_adjust_by}` : ''
  const at   = dateData?.stock_adjust_at   ? ` · ${dateData.stock_adjust_at.slice(0, 16).replace('T', ' ')}` : ''
  const note = dateData?.stock_adjust_note ? ` · "${dateData.stock_adjust_note}"` : ''
  return `✏ Dikoreksi manual${by}${at}${note} · Klik untuk ubah`
}

// ── Tooltip untuk PLAN cells ──────────────────────────────────
function planCellTitle(dateData: DateData | undefined, shift: 'day' | 'night'): string {
  if (!dateData) return 'Klik untuk edit plan';
  const isLocked = shift === 'day' ? dateData.lock_day : dateData.lock_night;
  if (isLocked) {
    const by = dateData.locked_by ? ` oleh ${dateData.locked_by}` : '';
    const note = dateData.lock_note ? ` · "${dateData.lock_note}"` : '';
    return `🔒 Terkunci${by}${note} · Klik untuk ubah`;
  }
  // Keterangan (Aturan #7) — kenapa angka plan shift ini sebesar itu.
  const reason = shift === 'day' ? dateData.day_note : dateData.night_note;
  if (reason) return `${reason} · Klik untuk edit / lock plan`;
  return 'Klik untuk edit / lock plan';
}

// ── Buffer Mesin OFF (styling grid) — murni info baca dari backend
// _off_buffer_map(), tak pernah mengubah angka plan/actual itu sendiri. ──
function isOffDay(job: Job, tanggal: number, shift: 'day' | 'night'): boolean {
  return !!job.machineOff?.[tanggal]?.[shift];
}
function bufferInfo(job: Job, tanggal: number) {
  return job.bufferBuild?.[tanggal] ?? null;
}
function bufferTitle(job: Job, tanggal: number): string {
  const b = bufferInfo(job, tanggal);
  if (!b) return '';
  return `Buffer utk OFF mesin ${b.offStart} – ${b.offEnd} (${b.offDays} hari) · target akumulasi ±${b.targetQty} pcs`;
}

// ── Style helpers ─────────────────────────────────────────────
const COL_KEY_MAP: Record<string, string> = {
  no: 'no',
  jobNo: 'jobNo',
  partNo: 'partNo',
  name: 'name',
  model: 'model',
  lot: 'lot',
  stock: 'stock',
  desc: 'desc'
};

function colStyle(bodyKey: string) {
  const key = COL_KEY_MAP[bodyKey] ?? bodyKey;
  const w = leftWidths.value[key] ?? 0;
  const left = stickyOffsets.value[key] ?? 0;
  return { width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px`, left: `${left}px` };
}

function dayColStyle(day: number, doubled = false) {
  const w = (dateWidths.value[day] ?? 46) * (doubled ? 2 : 1);
  return { width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` };
}

// ── Row / cell class helpers ──────────────────────────────────
const getRowClass = (type: string) =>
  (
    ({
      FORECAST: 'row-forecast',
      DELIVERY: 'row-delivery',
      PLAN: 'row-plan',
      PLAN_SECONDARY: 'row-plan-secondary',
      ACTUAL: 'row-actual',
      BALANCE: 'row-balance',
      STOCK: 'row-stock',
      STRENGTH: 'row-strength',
      PCS_PER_DAY: 'row-pcs-per-day'
    }) as Record<string, string>
  )[type] ?? '';

const getDescClass = (type: string) =>
  (
    ({
      FORECAST: 'desc-forecast',
      DELIVERY: 'desc-delivery',
      PLAN: 'desc-plan',
      PLAN_SECONDARY: 'desc-plan-secondary',
      ACTUAL: 'desc-actual',
      BALANCE: 'desc-balance',
      STOCK: 'desc-stock',
      STRENGTH: 'desc-strength',
      PCS_PER_DAY: 'desc-pcs-per-day'
    }) as Record<string, string>
  )[type] ?? '';

const getCellClass = (type: string, value: any, qty_kbn: number, job?: Job) => {
  if (value === null || value === undefined || value === '') return '';
  const v = Number(value);
  if (isNaN(v)) return '';
  if (type === 'ACTUAL') {
    if (v === 0) return '';
    if (v >= qty_kbn) return 'achievement-100';
    if (v >= qty_kbn * 0.7) return 'achievement-70';
    return 'achievement-low';
  }
  if ((type === 'BALANCE' || type === 'STOCK') && v < 0) return 'cell-negative';
  if ((type === 'BALANCE' || type === 'STOCK') && v === 0) return 'cell-zero';
  if (type === 'STRENGTH') {
    if (v === 0) return '';
    // Band per-baris bila ada (safety dinamis WIP), selain itu default jenis baris (FP 12–20, WIP 8–12).
    const [bandLo, bandHi] = STRENGTH_BAND[job?.kind ?? 'FP'];
    const lo = job?.strengthSafeMin ?? bandLo;
    const hi = job?.strengthSafeMax ?? bandHi;
    if (v < lo) return 'strength-danger';
    if (v <= hi) return 'strength-safe';
    return 'strength-warn';
  }
  return '';
};

const formatCell = (type: string, value: any): string => {
  if (value === null) return '-';
  if (value === undefined || value === '') return '';
  const v = Number(value);
  if (isNaN(v)) return '';
  if (v === 0 && (type === 'FORECAST' || type === 'PCS_PER_DAY')) return '';
  if (v === 0) return '0';
  if (type === 'STRENGTH' || type === 'PCS_PER_DAY') return v.toFixed(2);
  return String(v);
};

const formatTotal = (type: string, total: any): string => {
  if (total === null) return '-';
  if (total === undefined || total === '') return '';
  const v = Number(total);
  if (isNaN(v)) return '';
  if (type === 'STRENGTH' || type === 'PCS_PER_DAY') return v.toFixed(2);
  return String(v);
};
</script>

<style scoped>
/* Badge status Master Data (baris bukan lagi FP aktif di area ini); keterangan di tooltip. */
.ms-badge {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 3px; margin-top: 2px;
  padding: 0 6px; border-radius: 999px; font-size: 9px; font-weight: 700; line-height: 15px;
  letter-spacing: .02em; cursor: help; white-space: nowrap; border: 1px solid;
}
.ms-badge .mdi { font-size: 10px; }
.ms-badge--runout       { background: var(--dm-tint-red, #fef2f2); color: var(--dm-on-red, #b91c1c); border-color: var(--dm-bd-red, #fecaca); }
.ms-badge--merged       { background: var(--dm-tint-violet, #f5f3ff); color: var(--dm-on-violet, #6d28d9); border-color: var(--dm-bd-blue, #ddd6fe); }
.ms-badge--moved        { background: var(--dm-tint-amber, #fffbeb); color: var(--dm-on-amber, #b45309); border-color: var(--dm-bd-amber, #fde68a); }
.ms-badge--now_wip      { background: var(--dm-tint-blue, #eff6ff); color: var(--dm-accent, #1d4ed8); border-color: var(--dm-bd-blue, #bfdbfe); }
.ms-badge--unregistered { background: var(--dm-bg, #f1f5f9); color: var(--dm-text-2, #475569); border-color: var(--dm-border-strong, #cbd5e1); }
/* Tanggal shift aktif: semua angka di-bold (lihat isFocusDay). */
td[data-focus] { font-weight: 700 !important; }
td[data-focus] * { font-weight: 700 !important; }
/* Tanggal sudah lewat (beku/final): latar diredupkan tipis, teks & warna peringatan
   tetap — abu-abu miring khusus utk angka PERKIRAAN (hari ke depan). */
td[data-past] { box-shadow: inset 0 0 0 999px rgba(100, 116, 139, 0.13); }
/* Tanggal disembunyikan: 1 sel sempit (colspan 2) supaya kolom tetap sejajar header. */
.collapsed-day-cell {
  width: 18px; min-width: 18px; max-width: 18px; padding: 0 !important;
  background: repeating-linear-gradient(135deg, var(--dm-bg, #e2e8f0) 0 3px, var(--dm-bg, #f1f5f9) 3px 6px) !important;
  border-left: 1px solid var(--dm-border-strong, #cbd5e1); border-right: 1px solid var(--dm-border-strong, #cbd5e1);
}
/* ── Sticky columns ─────────────────────────────────────────── */
.sticky-col {
  position: sticky;
  background: var(--dm-surface, white);
  z-index: 10;
  overflow: hidden;
  box-sizing: border-box;
}
.col-no { min-width: 40px; }
.col-kind { min-width: 44px; text-align: center; }
.kind-badge {
  display: inline-block; min-width: 34px; padding: 2px 6px; border-radius: 5px;
  font-size: 10px; font-weight: 800; letter-spacing: .04em; line-height: 1.3;
}
.kind-badge--fp  { background: var(--dm-tint-blue, #dbeafe); color: var(--dm-accent, #1d4ed8); border: 1px solid var(--dm-bd-blue, #bfdbfe); }
.kind-badge--wip { background: var(--dm-tint-violet, #ede9fe); color: var(--dm-on-violet, #6d28d9); border: 1px solid var(--dm-bd-blue, #ddd6fe); }
.col-job { min-width: 70px; }
.col-part { min-width: 90px; }
.col-model { min-width: 50px; }
.col-lot { min-width: 50px; }
.col-stock { min-width: 60px; }
.col-desc {
  min-width: 100px;
  border-right: 2px solid #2e5396 !important;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
}
.sticky-right {
  position: sticky;
  right: 0;
  border-left: 2px solid #2e5396 !important;
  box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
  background: var(--dm-bg, #f2f2f2);
  font-weight: bold;
  text-align: right;
  padding-right: 8px;
}

/* ── Virtualisasi: baris spacer (mewakili job yang tak dirender) ── */
.virt-spacer { padding: 0; border: none; }
/* Spacer bergaris ala baris tabel (skeleton): saat scroll cepat / drag scrollbar, area yang
   belum sempat di-render tampil sbg baris kosong, bukan layar putih. 25px = tinggi baris. */
.virt-spacer-cell {
  padding: 0; border: none;
  background-color: var(--dm-surface, #ffffff);
  background-image: repeating-linear-gradient(to bottom, transparent 0 24px, #e2e8f0 24px 25px);
}

/* ── Base cells ────────────────────────────────────────────── */
.body-cell {
  padding: 4px 3px;
  border: 1px solid var(--dm-border, #e0e0e0);
  background: var(--dm-surface, white);
  color: var(--dm-text, inherit);   /* tanpa ini teks mewarisi hitam Vuetify di mode gelap */
  font-size: 10px;
  white-space: nowrap;
  vertical-align: middle;
}
.merged-cell {
  font-weight: 600;
  text-align: center;
  vertical-align: middle;
}
.text-left {
  text-align: left !important;
  padding-left: 8px !important;
}
.text-right {
  text-align: right !important;
  padding-right: 8px !important;
}
.cell-overflow {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

/* ── STOCK cell interactivity ─────────────────────────────── */
.stock-cell {
  cursor: pointer;
  transition: background 0.1s;
}
.stock-cell:hover {
  background: var(--dm-tint-blue, #e8eaf6) !important;
  outline: 1px solid #3f51b5;
  outline-offset: -1px;
}

/* Manually adjusted stock cell */
.stock-adjusted {
  background: var(--dm-tint-teal, #cffafe) !important; /* cyan-100 */
  border-color: #22d3ee !important; /* cyan-400 */
}
.stock-adjusted:hover {
  background: #a5f3fc !important; /* cyan-200 */
  outline: 1px solid #06b6d4; /* cyan-500 */
  outline-offset: -1px;
}
tr:hover .stock-adjusted {
  background: #a5f3fc !important;
}

.stock-cell-inner {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  width: 100%;
}
.stock-adj-icon {
  font-size: 8px;
  color: var(--dm-on-teal, #0891b2); /* cyan-600 */
  flex-shrink: 0;
  opacity: 0.8;
}

/* ── PLAN cell interactivity ──────────────────────────────── */
.plan-cell {
  cursor: pointer;
  transition: background 0.1s;
  position: relative;
}

.plan-cell--editable:hover {
  background: var(--dm-tint-blue, #eef6ff) !important;
  outline: 1px solid #4472c4;
  outline-offset: -1px;
}

.plan-cell--locked {
  background: var(--dm-tint-red, #fff5f5) !important;
}

.plan-cell--locked:hover {
  background: var(--dm-tint-red, #fee2e2) !important;
  outline: 1px solid #ef4444;
  outline-offset: -1px;
}

/* Buffer Mesin OFF (styling grid) — murni info baca, lihat _off_buffer_map().
   Ditemukan saat verifikasi: baris PLAN & ACTUAL masing-masing punya rule tint
   per-row sendiri (".row-plan .day-cell/.night-cell" dan ".row-actual .day-cell/
   .night-cell", spesifisitas 2 kelas = (0,0,2,0), !important) — MENGALAHKAN rule
   1-kelas biasa meski sama-sama !important (antar !important tetap dibandingkan
   spesifisitas dulu, bukan urutan). ".achievement-100/-70/-low" (row ACTUAL)
   juga 1-kelas, kalah juga. Vue scoped style OTOMATIS menambah [data-v-xxx] ke
   SEMUA selector (termasuk rule kompetitor) — jadi kompetitor sebenarnya
   (0,0,3,0) (2 kelas + 1 attr), bukan (0,0,2,0). Trik kelas yg sama ditulis 3×
   (".plan-cell--off.plan-cell--off.plan-cell--off") + attr scoping = (0,0,4,0),
   pasti menang tanpa bergantung urutan sumber ATAU kelas lain yg kebetulan ada
   di elemen (beda antara row PLAN yg punya .plan-cell dan row ACTUAL yg tidak). */
.plan-cell--off.plan-cell--off.plan-cell--off {
  background: repeating-linear-gradient(45deg, var(--dm-bg, #f1f5f9), var(--dm-bg, #f1f5f9) 6px, var(--dm-bg, #e2e8f0) 6px, var(--dm-bg, #e2e8f0) 12px) !important;
  color: var(--dm-faint, #94a3b8) !important;
  font-size: 8.5px;
  font-weight: 700;
  text-align: center;
  line-height: 1.15;
  cursor: not-allowed !important;
  white-space: normal;
}
.plan-cell--off.plan-cell--off.plan-cell--off:hover {
  outline: none !important;
}
.plan-cell--buffer.plan-cell--buffer.plan-cell--buffer {
  background: var(--dm-tint-amber, #fff7ed) !important;
  box-shadow: inset 0 0 0 1px #fdba74;
}

/* Inner wrapper for icon + value */
.plan-cell-inner {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  width: 100%;
}

/* Lock icon in cell */
.plan-lock-icon {
  font-size: 8px;
  color: #ef4444;
  flex-shrink: 0;
  opacity: 0.8;
}

/* ── Description label colors ─────────────────────────────── */
.desc-forecast {
  background: var(--dm-solid-blue, #e3f2fd) !important;
  color: var(--dm-accent, #0d47a1);
  font-weight: 600;
  font-size: 10px;
}
.desc-delivery {
  background: var(--dm-solid-blue, #e7f3ff) !important;
  color: var(--dm-accent, #0066cc);
  font-weight: 600;
  font-size: 10px;
}
.desc-plan {
  background: var(--dm-solid-green, #e8f5e9) !important;
  color: var(--dm-on-green, #2e7d32);
  font-weight: 600;
  font-size: 10px;
}
.desc-plan-secondary {
  background: var(--dm-solid-violet, #ede7f6) !important;
  color: var(--dm-on-violet, #5e35b1);
  font-weight: 600;
  font-size: 10px;
}
.row-plan-secondary .day-cell,
.row-plan-secondary .night-cell {
  background: var(--dm-solid-violet, #f5f0ff);
  color: var(--dm-on-violet, #5e35b1);
}
.desc-actual {
  background: var(--dm-solid-violet, #f3e5f5) !important;
  color: var(--dm-on-violet, #7b1fa2);
  font-weight: 600;
  font-size: 10px;
}
.desc-balance {
  background: var(--dm-solid-amber, #fff3e0) !important;
  color: var(--dm-on-amber, #e65100);
  font-weight: 600;
  font-size: 10px;
}
.desc-stock {
  background: var(--dm-solid-blue, #e8eaf6) !important;
  color: var(--dm-accent, #283593);
  font-weight: 600;
  font-size: 10px;
}
.desc-strength {
  background: var(--dm-solid-red, #fce4ec) !important;
  color: var(--dm-on-violet, #880e4f);
  font-weight: 600;
  font-size: 10px;
}
.desc-pcs-per-day {
  background: var(--dm-solid-green, #f3f9e8) !important;
  color: var(--dm-on-green, #558b2f);
  font-weight: 600;
  font-size: 10px;
}

/* ── Row backgrounds ─────────────────────────────────────── */
.row-forecast .day-cell,
.row-forecast .night-cell {
  background: var(--dm-tint-blue, #f5fbff) !important;
}
.row-delivery .day-cell,
.row-delivery .night-cell {
  background: var(--dm-tint-blue, #ebf4ff) !important;
}
.row-plan .day-cell,
.row-plan .night-cell {
  background: var(--dm-tint-green, #f1f8f2) !important;
}
.row-actual .day-cell,
.row-actual .night-cell {
  background: var(--dm-tint-violet, #faf0fe) !important;
}
.row-balance .day-cell,
.row-balance .night-cell {
  background: var(--dm-tint-amber, #fff8f0) !important;
}
.row-stock .day-cell,
.row-stock .night-cell {
  background: var(--dm-tint-blue, #f0f1fb) !important;
}
.row-strength .day-cell,
.row-strength .night-cell {
  background: var(--dm-tint-red, #fef5f8) !important;
}
.row-pcs-per-day .day-cell,
.row-pcs-per-day .night-cell,
.row-pcs-per-day .merged-day-cell {
  background: var(--dm-tint-green, #f7fcf0) !important;
}

/* ── Data cells ──────────────────────────────────────────── */
.data-cell {
  text-align: right;
  padding-right: 4px;
}
.day-cell {
  border-right: 1px dashed var(--dm-border, #ddd) !important;
}
.night-cell {
  border-right: 1px solid var(--dm-border, #e0e0e0) !important;
}

/* ── Special merged cells ────────────────────────────────── */
.forecast-cell {
  background: var(--dm-tint-blue, #ddeeff) !important;
  text-align: center;
  font-weight: 600;
  color: var(--dm-accent, #003399);
}
/* DN bisa di-adjust: kursor + hover; sudah di-adjust: sudut kuning (aktif) / abu (tersimpan, DN sistem yg tampil). */
.dn-cell--edit { cursor: pointer; }
.dn-cell--edit:hover { outline: 1px solid #6366f1; outline-offset: -1px; }
.dn-cell--adj, .dn-cell--adj-idle { position: relative; }
.dn-cell--adj { font-weight: 700; color: var(--dm-on-amber, #b45309) !important; }
.dn-cell--adj::after, .dn-cell--adj-idle::after {
  content: ''; position: absolute; top: 0; right: 0;
  border-top: 7px solid #f59e0b; border-left: 7px solid transparent;
}
.dn-cell--adj-idle::after { border-top-color: #94a3b8; }

.forecast-cell--clickable {
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
}
.forecast-cell--clickable:hover {
  background: var(--dm-tint-blue, #c2e0ff) !important;
  outline: 1px solid #2563eb;
  outline-offset: -1px;
}
.pcs-per-day-cell {
  background: var(--dm-tint-green, #eef7e0) !important;
  text-align: center;
  font-weight: 600;
  color: var(--dm-on-green, #33691e);
}
.plan-estimated {
  opacity: 0.5;
}
.text-gray {
  color: #999 !important;
}
.cell-null {
  color: #cccccc;
  font-style: italic;
  text-align: center;
}
.cell-zero {
  color: #aaaaaa;
  font-style: italic;
}

/* ── Achievement / status colors ─────────────────────────── */
.achievement-100 {
  background: #c6efce !important;
  color: var(--dm-on-green, #006100);
  font-weight: bold;
}
.achievement-70 {
  background: #ffeb9c !important;
  color: var(--dm-on-amber, #9c5700);
}
.achievement-low {
  background: var(--dm-tint-red, #ffc7ce) !important;
  color: var(--dm-on-red, #9c0006);
}
.cell-negative {
  background: var(--dm-tint-red, #ffd7d7) !important;
  color: var(--dm-on-red, #c00000);
  font-weight: bold;
}
/* Strength: WARNA TEKS sesuai ambang jam (tanpa background) */
.strength-safe {
  color: var(--dm-on-green, #16a34a) !important;   /* hijau · 12–20 jam */
  font-weight: 700;
}
.strength-warn {
  color: var(--dm-on-amber, #ca8a04) !important;   /* kuning · > 20 jam */
  font-weight: 700;
}
.strength-danger {
  color: var(--dm-on-red, #dc2626) !important;   /* merah · < 12 jam */
  font-weight: 700;
}
/* Sel proyeksi (hari > cutoff / malam belum jalan): tampil samar spt PLAN estimasi */
.cell-projected {
  /* Dulu opacity .55 pada SEL → warna baris ikut pudar jadi putih-kotor. Kini
     hanya teksnya yang disamarkan; latar baris tetap. */
  color: #8a94a6 !important;
  font-style: italic;
  font-weight: 500;
}
.cell-projected .strength-danger,
.cell-projected .strength-safe,
.cell-projected .strength-over { opacity: .7; }

/* ── Libur nasional: kolom dipudarkan, pita label vertikal dominan ──── */
td[data-holiday] {
  position: relative;
  background-image: repeating-linear-gradient(135deg, rgba(220, 38, 38, .06) 0 6px, transparent 6px 12px) !important;
}
/* angka di kolom libur diredupkan supaya label libur yang menonjol */
td[data-holiday] > *:not(.holiday-ribbon),
td[data-holiday]:not(.forecast-cell) { color: rgba(71, 85, 105, .35); }
td[data-holiday] .strength-danger,
td[data-holiday] .strength-safe,
td[data-holiday] .strength-over,
td[data-holiday] .cell-projected { opacity: .35; }
.forecast-cell { position: relative; }
.holiday-ribbon {
  /* Pita VERTIKAL dibaca atas→bawah, dari sel MDFO menembus blok job.
     Aliran kata menerus antar job — lihat holidayChunks(). */
  position: absolute;
  top: 3px;
  left: 50%;
  transform: translateX(-50%);
  writing-mode: vertical-rl;
  height: 200px;
  line-height: 1;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: rgba(185, 28, 28, .85);
  text-shadow: 0 0 4px #fff, 0 0 4px #fff, 0 0 2px #fff;
  white-space: nowrap;
  overflow: visible;
  pointer-events: none;
  z-index: 3;
}

/* ── Initial stock editable cell ────────────────────────────── */
.stock-editable-cell {
  cursor: pointer;
  outline: none;
}
.stock-editable-cell:hover .stock-edit-icon {
  opacity: 1;
}
.stock-edit-icon {
  font-size: 9px;
  color: var(--dm-faint, #94a3b8);
  margin-left: 3px;
  opacity: 0;
  transition: opacity 0.15s;
  vertical-align: middle;
}

/* Inner wrap so lock/value/pencil align rapi di kanan */
.stock-val-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  width: 100%;
}

/* Tombol reset ke stok bulan lalu — ikon kecil netral, hanya muncul saat hover.
   Tidak mengubah tampilan sel saat idle (diperlakukan sama dgn sel lain). */
.stock-reset-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  margin-left: 1px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--dm-faint, #94a3b8);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, color 0.12s;
  flex-shrink: 0;
}
.stock-editable-cell:hover .stock-reset-btn { opacity: 1; }
.stock-reset-btn:hover { color: var(--dm-text-2, #475569); }

/* ── Row hover ───────────────────────────────────────────── */
tr:hover .body-cell {
  background-color: var(--dm-solid-blue, #e3f2fd) !important;
}
tr:hover .desc-forecast {
  background: #bbdefb !important;
}
tr:hover .desc-delivery {
  background: var(--dm-solid-blue, #d1e9ff) !important;
}
tr:hover .desc-plan {
  background: var(--dm-solid-green, #d4edd8) !important;
}
tr:hover .desc-actual {
  background: var(--dm-solid-violet, #e8d7ee) !important;
}
tr:hover .desc-balance {
  background: var(--dm-solid-amber, #ffe8d1) !important;
}
tr:hover .desc-stock {
  background: var(--dm-solid-blue, #d4d8f0) !important;
}
tr:hover .desc-strength {
  background: #f5c6d8 !important;
}
tr:hover .desc-pcs-per-day {
  background: var(--dm-solid-green, #e4f2d0) !important;
}

/* Override row hover untuk locked plan cells */
tr:hover .plan-cell--locked {
  background: var(--dm-solid-red, #fee2e2) !important;
}

/* ── Shift-mode chip + popover (Aturan #5) ───────────────────── */
.part-wrap { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; line-height: 1.25; width: 100%; padding: 0 2px; }
.part-no-text { font-weight: 700; max-width: 100%; }
.job-no-inline { font-weight: 600; color: var(--dm-muted, #64748b); }
.part-name-text { font-size: 9px; color: var(--dm-muted, #64748b); max-width: 100%; }
.machine-text { font-weight: 600; color: var(--dm-cell, #334155); }
.sm-chip {
  display: inline-flex; align-items: center; gap: 3px; margin-top: 1px; border: none; border-radius: 9px;
  font-size: 9px; font-weight: 700; padding: 0 6px 0 4px; line-height: 15px; cursor: pointer;
  letter-spacing: .1px; background: var(--dm-bg, #e2e8f0); color: var(--dm-text-2, #475569); transition: filter .12s;
}
.sm-chip .mdi { font-size: 10px; line-height: 1; }
.sm-chip:hover { filter: brightness(.94); outline: 1px solid #94a3b8; }
.sm-chip.sm-day   { background: #fde68a; color: var(--dm-on-amber, #92400e); }
.sm-chip.sm-night { background: var(--dm-tint-blue, #c7d2fe); color: var(--dm-accent, #3730a3); }

/* CUSTOMER + MODEL dalam 1 sel */
.cust-wrap { display: flex; flex-direction: column; align-items: center; gap: 2px; line-height: 1.2; }
.cust-name { font-weight: 600; }
.model-chip {
  display: inline-block; font-size: 9px; font-weight: 700; letter-spacing: .2px;
  padding: 0 5px; line-height: 14px; border-radius: 3px;
  background: var(--dm-bg, #f1f5f9); color: var(--dm-text-2, #475569); border: 1px solid var(--dm-border, #e2e8f0);
}
</style>

<style>
/* Popover di-teleport ke body → style NON-scoped (global) dgn prefix sm-pop. */
.sm-pop { position: fixed; inset: 0; z-index: 9999; }
.sm-pop .sm-overlay { position: fixed; inset: 0; background: transparent; }
.sm-pop .sm-card {
  position: fixed; background: var(--dm-surface, #fff); border: 1px solid var(--dm-border-strong, #cbd5e1); border-radius: 10px;
  box-shadow: 0 10px 28px rgba(0,0,0,.18); padding: 12px 14px; width: 290px;
}
.sm-pop .sm-title { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 800; color: var(--dm-cell, #334155); margin-bottom: 10px; }
.sm-pop .sm-title .mdi { color: var(--dm-accent, #0ea5e9); font-size: 14px; }
.sm-pop .sm-part { margin-left: auto; font-family: ui-monospace, monospace; font-size: 10.5px; font-weight: 700; color: var(--dm-muted, #64748b); background: var(--dm-bg, #f1f5f9); padding: 1px 6px; border-radius: 4px; }
.sm-pop .sm-modes { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.sm-pop .sm-mbtn {
  display: grid; grid-template-columns: 22px 1fr; grid-template-rows: auto auto; column-gap: 8px; align-items: center;
  text-align: left; border: 1px solid var(--dm-border-strong, #cbd5e1); background: var(--dm-surface2, #f8fafc); border-radius: 8px; padding: 6px 9px; cursor: pointer; color: var(--dm-text-2, #475569);
}
.sm-pop .sm-mbtn .mdi { grid-row: 1 / span 2; font-size: 18px; }
.sm-pop .sm-mlbl { font-size: 11.5px; font-weight: 700; line-height: 1.2; }
.sm-pop .sm-mdesc { font-size: 9.5px; color: var(--dm-muted, #64748b); line-height: 1.2; }
.sm-pop .sm-mbtn:hover { background: var(--dm-bg, #f1f5f9); }
.sm-pop .sm-mbtn.on { border-width: 2px; }
.sm-pop .sm-mbtn.on.sm-mbtn--both  { background: var(--dm-tint-blue, #e0f2fe); border-color: #0ea5e9; color: var(--dm-accent, #0c4a6e); }
.sm-pop .sm-mbtn.on.sm-mbtn--day   { background: var(--dm-tint-amber, #fef3c7); border-color: #f59e0b; color: var(--dm-on-amber, #92400e); }
.sm-pop .sm-mbtn.on.sm-mbtn--night { background: var(--dm-tint-blue, #e0e7ff); border-color: #6366f1; color: var(--dm-accent, #3730a3); }
.sm-pop .sm-mbtn.on .sm-mdesc { color: inherit; opacity: .8; }
.sm-pop .sm-scope { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.sm-pop .sm-slbl { font-size: 10px; font-weight: 600; color: var(--dm-muted, #64748b); }
.sm-pop .sm-sgrp { display: flex; gap: 4px; }
.sm-pop .sm-sbtn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 4px; border: 1px solid var(--dm-border-strong, #cbd5e1); background: var(--dm-surface2, #f8fafc); border-radius: 6px; padding: 5px 4px; font-size: 10px; font-weight: 600; color: var(--dm-text-2, #475569); cursor: pointer; }
.sm-pop .sm-sbtn.on { background: #334155; border-color: #334155; color: #fff; }
.sm-pop .sm-hint { display: flex; gap: 5px; align-items: flex-start; font-size: 9.5px; color: var(--dm-muted, #64748b); line-height: 1.35; margin: 0 0 10px; }
.sm-pop .sm-hint .mdi { font-size: 11px; margin-top: 1px; flex-shrink: 0; }
.sm-pop .sm-btns { display: flex; gap: 6px; }
.sm-pop .sm-ok { flex: 1.4; display: inline-flex; align-items: center; justify-content: center; gap: 4px; background: #059669; color: #fff; border: none; border-radius: 6px; padding: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }
.sm-pop .sm-ok:disabled { background: #cbd5e1; cursor: not-allowed; }
.sm-pop .sm-no { flex: 1; background: var(--dm-bg, #e2e8f0); color: var(--dm-text-2, #475569); border: none; border-radius: 6px; padding: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }
</style>
