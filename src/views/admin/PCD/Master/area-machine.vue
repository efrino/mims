<template>
  <div class="am-page">
    <!-- Header -->
    <div class="am-header">
      <div class="am-header-icon"><i class="mdi mdi-map-marker-radius-outline"></i></div>
      <div>
        <h1>Area &amp; Mesin {{ isStamping ? 'Stamping' : 'Welding' }}</h1>
        <p v-if="isStamping">Master line press inhouse (A–H, SP), saklar aktif area, daftar mesin + spec press, slot dies, dan denah 2D posisi mesin.</p>
        <p v-else>Master area per plant (WSS / CO / SA × ADM / MMKI / HMMI), saklar aktif area, daftar mesin, dan denah 2D posisi mesin.</p>
      </div>
      <div class="am-header-actions">
        <button class="am-btn" :disabled="loading" @click="loadAreas">
          <i class="mdi mdi-refresh" :class="{ 'mdi-spin': loading }"></i> Segarkan
        </button>
        <button v-if="!isStamping && !areas.length && !loading" class="am-btn am-btn--primary" @click="seedAreas">
          <i class="mdi mdi-database-import-outline"></i> Isi Area Default
        </button>
      </div>
    </div>

    <div v-if="loadError" class="am-status am-status--error"><i class="mdi mdi-alert-circle"></i> {{ loadError }}</div>
    <div v-else-if="loading && !areas.length" class="am-status"><i class="mdi mdi-loading mdi-spin"></i> Memuat area...</div>
    <div v-else-if="!areas.length && isStamping" class="am-status">Belum ada area stamping.</div>
    <div v-else-if="!areas.length" class="am-status">Belum ada area. Klik <strong>Isi Area Default</strong> untuk membuat 9 area master (WSS / CO / SA × ADM / MMKI / HMMI).</div>

    <div v-else class="am-body">
      <!-- ── Kiri: daftar area, dikelompokkan per plant ── -->
      <aside class="am-side">
        <div v-for="g in areaGroups" :key="g.label" class="am-plant">
          <div class="am-plant-head">{{ g.label }}</div>
          <button
            v-for="a in g.items" :key="a.id" type="button"
            class="am-area" :class="{ 'am-area--sel': selected?.id === a.id, 'am-area--off': !a.is_active }"
            :style="getStyle(a.area_code)" @click="selectArea(a)"
          >
            <div class="am-area-top">
              <span class="am-area-type">{{ a.area_type }}</span>
              <span class="am-area-code">{{ a.area_code }}</span>
              <label class="am-switch" :title="a.is_active ? 'Aktif — klik untuk nonaktifkan' : 'Nonaktif — klik untuk aktifkan'" @click.stop>
                <input type="checkbox" :checked="!!a.is_active" :disabled="togglingArea === a.id" @change="toggleArea(a)">
                <span class="am-switch-track"><span class="am-switch-knob"></span></span>
              </label>
            </div>
            <div class="am-area-meta">
              <span><i class="mdi mdi-robot-industrial-outline"></i> {{ a.machine_active }}/{{ a.machine_total }} mesin</span>
              <span v-if="!isStamping && !zonesOf(a).length" class="am-area-warn"><i class="mdi mdi-alert-outline"></i> belum terhubung data</span>
            </div>
          </button>
        </div>
        <div v-if="!isStamping" class="am-type-legend" title="Warna = tipe area, makin tua = ADM, sedang = MMKI, muda = HMMI">
          <span v-for="t in AREA_TYPE_LEGEND" :key="t.type"><i :style="{ background: t.color }"></i>{{ t.type }} <small>{{ t.label }}</small></span>
        </div>
      </aside>

      <!-- ── Kanan: detail area terpilih ── -->
      <section v-if="selected" class="am-main">
        <div class="am-main-head" :style="getStyle(selected.area_code)">
          <div class="am-main-title">
            <span class="am-main-type">{{ selected.area_type }} · {{ isStamping ? (selected as StampingArea).area_name : (selected as WeldingArea).plant }}</span>
            <h2>{{ selected.area_code }}</h2>
            <span class="am-main-status" :class="selected.is_active ? 'on' : 'off'">{{ selected.is_active ? 'AKTIF' : 'NONAKTIF' }}</span>
          </div>
          <div class="am-tabs">
            <button type="button" :class="{ active: tab === 'layout' }" @click="tab = 'layout'"><i class="mdi mdi-floor-plan"></i> Denah 2D</button>
            <button type="button" :class="{ active: tab === 'list' }" @click="tab = 'list'"><i class="mdi mdi-format-list-bulleted"></i> Daftar Mesin</button>
          </div>
        </div>

        <!-- Pemetaan ke nilai area lama (kompatibilitas data) — TIDAK ditampilkan
             sebagai konsep ke user; hanya muncul bila area belum terhubung data. -->
        <div v-if="!isStamping && (!zonesOf(selected).length || unassigned.length)" class="am-zones-box">
          <div class="am-zones-label">
            <i class="mdi mdi-link-variant"></i> Hubungkan data lama
            <span class="am-hint">nilai <code>area</code> lama di data part/mesin yang masuk ke area ini. Data part tidak diubah.</span>
          </div>
          <div class="am-zones-row">
            <span v-for="z in zonesOf(selected)" :key="z.id" class="am-zone-chip am-zone-chip--lg" :style="getStyle(z.zone)">
              {{ z.zone }}
              <button type="button" class="am-zone-x" title="Lepas dari area ini" :disabled="savingZones" @click="removeZone(z.zone)"><i class="mdi mdi-close"></i></button>
            </span>
            <span v-if="!zonesOf(selected).length" class="am-muted">Belum terhubung — mesin &amp; part belum masuk ke area ini.</span>
            <select v-model="zoneToAdd" class="am-select" :disabled="savingZones" @change="addZone">
              <option value="">+ hubungkan data lama…</option>
              <option v-for="u in unassigned" :key="u.zone" :value="u.zone">{{ u.zone }} ({{ u.n_machine }} mesin, {{ u.n_part }} part)</option>
              <option v-if="!unassigned.length" value="" disabled>semua data lama sudah terhubung</option>
            </select>
          </div>
        </div>

        <div v-if="machinesLoading" class="am-status"><i class="mdi mdi-loading mdi-spin"></i> Memuat mesin...</div>

        <!-- ══ Tab DENAH 2D ══ -->
        <div v-else-if="tab === 'layout'" class="am-layout" :class="{ 'am-layout--full': fullscreen && editLayout }">
          <div class="am-layout-bar">
            <template v-if="!editLayout">
              <span class="am-muted"><i class="mdi mdi-information-outline"></i> {{ placed.length }} mesin di denah, {{ unplaced.length }} belum ditaruh.</span>
              <button class="am-btn am-btn--accent" :disabled="!machines.length" @click="enterEditLayout"><i class="mdi mdi-drag"></i> Atur Denah</button>
            </template>
            <template v-else>
              <span class="am-muted am-edit-hint"><i class="mdi mdi-cursor-move"></i> Mode atur denah
                <span class="am-kbd-help" tabindex="0"><i class="mdi mdi-keyboard-outline"></i> Shortcut
                  <span class="am-kbd-pop">
                    <span><kbd>Drag</kbd> area kosong = pilih banyak</span>
                    <span><kbd>Shift</kbd>+klik = tambah/kurang pilihan</span>
                    <span><kbd>Ctrl+Z</kbd> undo · <kbd>Ctrl+Y</kbd> redo</span>
                    <span><kbd>Ctrl+A</kbd> pilih semua · <kbd>Esc</kbd> batal pilih</span>
                    <span><kbd>Ctrl+C</kbd> salin · <kbd>Ctrl+V</kbd> tempel di kursor · <kbd>Ctrl+X</kbd> potong · <kbd>Ctrl+D</kbd> duplikat</span>
                    <span><kbd>←↑→↓</kbd> geser 10px · <kbd>Shift</kbd> 50px</span>
                    <span><kbd>Del</kbd> hapus / lepas · <kbd>Ctrl+S</kbd> simpan</span>
                    <span><kbd>Ctrl+scroll</kbd> zoom · <kbd>Ctrl+0</kbd> muat layar · <kbd>Ctrl+1</kbd> 100%</span>
                    <span><kbd>Space</kbd>+drag / klik tengah / scroll = geser layar</span>
                    <span><kbd>F</kbd> layar penuh</span>
                  </span>
                </span>
              </span>
              <label class="am-size">
                <span class="am-auto" :class="{ on: fp.auto }" title="Ukuran kanvas mengikuti isi denah" @click="toggleAutoCanvas"><i class="mdi" :class="fp.auto ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline'"></i> Auto</span>
                Kanvas <input v-model.number="canvasW" type="number" :disabled="fp.auto" @focus="record" min="1" step="50"> × <input v-model.number="canvasH" type="number" :disabled="fp.auto" @focus="record" min="1" step="50"> px
              </label>
              <button class="am-btn" :disabled="savingLayout" @click="autoArrange"><i class="mdi mdi-view-grid-outline"></i> Susun Otomatis</button>
              <button class="am-btn" :disabled="savingLayout" @click="cancelEditLayout"><i class="mdi mdi-close"></i> Batal</button>
              <button class="am-btn am-btn--primary" :disabled="savingLayout" @click="saveLayout"><i class="mdi mdi-content-save" :class="{ 'mdi-spin': savingLayout }"></i> Simpan Denah</button>
            </template>
          </div>

          <!-- Toolbar elemen denah (mode edit) -->
          <div v-if="editLayout" class="am-fp-tools">
            <span class="am-fp-tools-label">Tambah</span>
            <button type="button" class="am-fp-tool" @click="addRegion()"><i class="mdi mdi-vector-square"></i> Wilayah</button>
            <button type="button" class="am-fp-tool" title="Wilayah khusus area WIP" @click="addRegion('wip')"><span class="am-fp-swatch" :style="{ background: REGION_TONES.wip.fill, border: `1.5px dashed ${REGION_TONES.wip.border}` }"></span> Area WIP</button>
            <span class="am-fp-sep"></span>
            <button v-for="(r, k) in ROAD_KINDS" :key="k" type="button" class="am-fp-tool" @click="addRoad(k)">
              <span class="am-fp-swatch am-fp-road--h" :class="`am-fp-road--${k}`"></span> {{ r.label }}
            </button>
            <span class="am-fp-sep"></span>
            <button v-for="(mk, k) in MARK_KINDS" :key="k" type="button" class="am-fp-tool am-fp-tool--icon" :title="mk.label" @click="addMark(k)">
              <span v-if="!mk.flow" class="am-fp-svg" v-html="markSvg(k, 20)"></span><b v-if="mk.flow" class="am-fp-flow-tag" :style="{ color: mk.color }">{{ mk.flow }}</b>
            </button>
            <span class="am-fp-sep"></span>
            <button type="button" class="am-fp-tool am-fp-tool--icon" :disabled="!canUndo" title="Undo (Ctrl+Z)" @click="undo"><i class="mdi mdi-undo"></i></button>
            <button type="button" class="am-fp-tool am-fp-tool--icon" :disabled="!canRedo" title="Redo (Ctrl+Y)" @click="redo"><i class="mdi mdi-redo"></i></button>
            <span class="am-fp-sep"></span>
            <button type="button" class="am-fp-tool" title="Putar arah utara 90°" @click="rotateNorth"><i class="mdi mdi-compass-outline"></i> Utara</button>
            <span class="am-fp-sep"></span>
            <span class="am-fp-tools-label">Mesin</span>
            <span class="am-seg">
              <button v-for="z in MC_SIZES" :key="z.k" type="button" :class="{ on: mcScale === z.k }" :title="`Ukuran kotak mesin ${z.label}`" @click="setMcScale(z.k)">{{ z.label }}</button>
            </span>
          </div>

          <!-- Bar konteks: tinggi tetap supaya kanvas tidak bergeser saat memilih -->
          <div v-if="editLayout" class="am-fp-inspect" :class="{ 'am-fp-inspect--idle': !selEl && !multiSel.size }">
          <template v-if="selEl">
            <template v-if="selEl.type === 'region'">
              <i class="mdi mdi-vector-square"></i>
              <input v-model="selEl.item.label" @focus="record" class="am-input" placeholder="nama wilayah (mis. BARAT)" maxlength="40">
              <span class="am-fp-tones">
                <button v-for="(t, k) in REGION_TONES" :key="k" type="button" class="am-fp-tone" :class="{ on: selEl.item.tone === k }"
                  :style="{ background: t.fill, borderColor: t.border }" :title="k" @click="record(); selEl.item.tone = k"></button>
              </span>
            </template>
            <template v-else-if="selEl.type === 'road'">
              <i class="mdi" :class="ROAD_KINDS[selEl.item.kind].icon"></i>
              <select v-model="selEl.item.kind" class="am-select" @focus="record">
                <option v-for="(r, k) in ROAD_KINDS" :key="k" :value="k">{{ r.label }}</option>
              </select>
              <input v-model="selEl.item.label" class="am-input" placeholder="label (opsional)" @focus="record" maxlength="30">
              <button type="button" class="am-btn" title="Putar 90°" @click="rotateRoad(selEl.item)"><i class="mdi mdi-rotate-right"></i> Putar</button>
            </template>
            <template v-else>
              <span v-if="!MARK_KINDS[selEl.item.kind].flow" class="am-fp-svg" v-html="markSvg(selEl.item.kind, 22)"></span>
              <select v-model="selEl.item.kind" class="am-select" @focus="record">
                <option v-for="(mk, k) in MARK_KINDS" :key="k" :value="k">{{ mk.label }}</option>
              </select>
              <input v-model="selEl.item.label" class="am-input" placeholder="label (opsional)" @focus="record" maxlength="30">
              <button v-if="MARK_KINDS[selEl.item.kind].flow" type="button" class="am-btn" title="Putar arah panah 90°" @click="rotateMarkDir(selEl.item)"><i class="mdi mdi-rotate-right"></i> Arah panah</button>
            </template>
            <button type="button" class="am-btn am-btn--danger" @click="removeSelected"><i class="mdi mdi-delete-outline"></i> Hapus</button>
          </template>
          <template v-else-if="multiSel.size">
            <i class="mdi mdi-selection-drag"></i>
            <strong>{{ multiSel.size }} dipilih</strong>
            <template v-if="selMachineIds.length">
              <span class="am-fp-sep"></span>
              <span class="am-fp-tools-label">IN/OUT {{ selMachineIds.length }} mesin</span>
              <button type="button" class="am-btn am-btn--flow-in" title="Pasang / putar arah panah IN" @click="flowStep('in')"><b>IN</b> <i class="mdi mdi-arrow-right-thick" :style="{ transform: `rotate(${flowDirOf('in') ?? 90}deg)` }"></i></button>
              <button type="button" class="am-btn am-btn--flow-out" title="Pasang / putar arah panah OUT" @click="flowStep('out')"><b>OUT</b> <i class="mdi mdi-arrow-right-thick" :style="{ transform: `rotate(${flowDirOf('out') ?? 270}deg)` }"></i></button>
              <span class="am-seg" title="Posisi badge IN/OUT">
                <button v-for="sd in FLOW_SIDES" :key="sd.k" type="button" :class="{ on: selFlowSide === sd.k }" :title="sd.title" @click="setFlowSide(sd.k)"><i class="mdi" :class="sd.icon"></i></button>
              </span>
              <button type="button" class="am-btn" title="Lepas IN/OUT dari mesin terpilih" @click="clearFlow"><i class="mdi mdi-close"></i> Lepas IN/OUT</button>
              <span class="am-fp-sep"></span>
            </template>
            <button v-if="multiSel.size > 1" type="button" class="am-btn" @click="regionFromSel"><i class="mdi mdi-vector-square"></i> Jadikan Wilayah</button>
            <button type="button" class="am-btn" title="Salin (Ctrl+C)" @click="copySel"><i class="mdi mdi-content-copy"></i></button>
            <button type="button" class="am-btn am-btn--danger" @click="removeSelected"><i class="mdi mdi-delete-outline"></i> Hapus / lepas</button>
          </template>
          <template v-else>
            <span class="am-muted"><i class="mdi mdi-gesture-tap"></i> Klik item untuk sunting · drag di area kosong untuk pilih banyak</span>
            <button type="button" class="am-btn" title="Pilih semua mesin untuk pasang IN/OUT sekaligus" @click="selectAllMachines"><i class="mdi mdi-select-all"></i> Pilih semua mesin</button>
            <button v-if="clipboard" type="button" class="am-btn" title="Tempel (Ctrl+V)" @click="pasteClip()"><i class="mdi mdi-content-paste"></i> Tempel {{ clipboard.n }}</button>
          </template>
          </div>

          <div
            ref="canvasWrap" class="am-canvas-wrap" :class="{ 'am-canvas-wrap--board': editLayout, 'am-canvas-wrap--pan': spaceDown || drag?.kind === 'pan' }"
            :style="editLayout ? {} : { height: canvasH * canvasScale + 4 + 'px' }"
            @wheel="onWheel" @pointerdown.capture="onWrapDownCapture" @pointerdown.self="clearSel"
            @pointermove="onDragMove" @pointerup="onDragEnd" @pointercancel="onDragEnd"
          >
            <div
              class="am-canvas" :class="{ 'am-canvas--edit': editLayout }"
              :style="{ width: canvasW + 'px', height: canvasH + 'px', transform: `translate(${panX}px, ${panY}px) scale(${canvasScale})` }"
              ref="canvasEl" @pointerdown.self="onCanvasDown"
            >
              <!-- Wilayah (paling bawah) -->
              <div
                v-for="r in fp.regions" :key="r.id" class="am-fp-region" :class="{ 'am-fp--sel': isSel(r.id) }"
                :style="{ ...rectStyle(r), background: REGION_TONES[r.tone].fill, borderColor: REGION_TONES[r.tone].border, color: REGION_TONES[r.tone].text }"
                @pointerdown="onElDown($event, r)"
              >
                <span class="am-fp-region-label">{{ r.label || 'Wilayah' }}</span>
                <template v-if="editLayout && isSel(r.id)"><span v-for="h in HANDLES" :key="h" class="am-fp-resize" :class="`am-fp-resize--${h}`" @pointerdown.stop="onResizeDown($event, r, h)"></span></template>
              </div>
              <!-- Jalan -->
              <div
                v-for="r in fp.roads" :key="r.id" class="am-fp-road"
                :class="[`am-fp-road--${r.kind}`, r.w >= r.h ? 'am-fp-road--h' : 'am-fp-road--v', { 'am-fp--sel': isSel(r.id) }]"
                :style="rectStyle(r)" :title="ROAD_KINDS[r.kind].label" @pointerdown="onElDown($event, r)"
              >
                <span v-if="r.label || r.kind === 'conveyor'" class="am-fp-road-label"><i v-if="r.kind === 'conveyor'" class="mdi mdi-cctv"></i> {{ r.label || 'QC AI KAMERA' }}</span>
                <template v-if="editLayout && isSel(r.id)"><span v-for="h in HANDLES" :key="h" class="am-fp-resize" :class="`am-fp-resize--${h}`" @pointerdown.stop="onResizeDown($event, r, h)"></span></template>
              </div>
              <!-- Sambungan jalan (auto-join): tutup garis tepi di pertemuan jalan sejenis -->
              <div v-for="(j, i) in roadJoints" :key="'j' + i" class="am-fp-joint" :style="{ ...rectStyle(j), background: j.color }"></div>
              <!-- Titik khusus -->
              <div
                v-for="mk in fp.marks" :key="mk.id" class="am-fp-mark" :class="{ 'am-fp--sel': isSel(mk.id), 'am-fp-mark--flow': MARK_KINDS[mk.kind].flow, 'am-fp-mark--sym': !MARK_KINDS[mk.kind].flow }"
                :style="{ left: mk.x + 'px', top: mk.y + 'px', color: MARK_KINDS[mk.kind].color }"
                :title="mk.label || MARK_KINDS[mk.kind].label" @pointerdown="onElDown($event, mk)"
              >
                <template v-if="MARK_KINDS[mk.kind].flow">
                  <b>{{ MARK_KINDS[mk.kind].flow }}</b><i class="mdi mdi-arrow-right-thick am-fp-arrow" :style="{ transform: `rotate(${mk.dir ?? 0}deg)` }"></i>
                </template>
                <span v-else class="am-fp-svg" v-html="markSvg(mk.kind, 36)"></span>
                <span v-if="mk.label" class="am-fp-mark-label">{{ mk.label }}</span>
              </div>
              <!-- Mesin (paling atas) — warna = status -->
              <div
                v-for="m in placed" :key="m.id"
                class="am-mc" :class="[`am-mc--${machineStatus(m)}`, `am-st--${machineStatus(m)}`, { 'am-mc--drag': drag?.kind === 'move' && drag.id === m.id, 'am-fp--sel': isSel(mcKey(m)) }]"
                :style="{ left: m.pos_x + 'px', top: m.pos_y + 'px', width: mcW + 'px', height: mcH + 'px', '--mcs': mcScale }"
                :title="`${m.machine}${m.machine_name ? ' — ' + m.machine_name : ''} · ${m.part_count} part · ${MACHINE_STATUS[machineStatus(m)].label}`"
                @pointerdown="onDragStart($event, m)"
              >
                <span class="am-mc-dot"></span>
                <span class="am-mc-code">{{ m.machine }}</span>
                <span v-if="m.machine_name" class="am-mc-zone">{{ m.machine_name }}</span>
                <span class="am-mc-parts">{{ m.part_count }}p</span>
                <template v-if="fp.mcFlow[m.id]">
                  <span v-for="fv in [flowView(m)!]" :key="fv.side" class="am-mc-flow" :class="`am-mc-flow--${fv.side}`">
                    <span v-if="fv.in !== undefined" class="am-mc-flow-in">IN<i class="mdi mdi-arrow-right-thick" :style="{ transform: `rotate(${fv.in}deg)` }"></i></span>
                    <span v-if="fv.out !== undefined" class="am-mc-flow-out">OUT<i class="mdi mdi-arrow-right-thick" :style="{ transform: `rotate(${fv.out}deg)` }"></i></span>
                  </span>
                </template>
                <button v-if="editLayout" type="button" class="am-mc-x" title="Lepas dari denah" @pointerdown.stop @click.stop="unplace(m)"><i class="mdi mdi-close"></i></button>
              </div>
              <div v-if="!placed.length" class="am-canvas-empty">
                Belum ada mesin di denah{{ editLayout ? ' — klik mesin di tray bawah atau "Susun Otomatis".' : '. Klik "Atur Denah".' }}
              </div>
              <!-- Kotak seleksi -->
              <div v-if="boxRect" class="am-fp-marquee" :style="rectStyle(boxRect)"></div>
              <!-- Kompas -->
              <div class="am-fp-compass" :title="`Arah utara ${fp.north}°`">
                <svg viewBox="0 0 48 48" :style="{ transform: `rotate(${fp.north}deg)` }">
                  <circle cx="24" cy="24" r="22" fill="#fff" stroke="#cbd5e1" stroke-width="1.5" />
                  <path d="M24 9 L29 25 L24 22 L19 25 Z" fill="#dc2626" />
                  <path d="M24 39 L29 23 L24 26 L19 23 Z" fill="#94a3b8" />
                </svg>
                <span>U</span>
              </div>
              <!-- Garis bantu snap -->
              <div v-for="(g, i) in snapGuides" :key="'g' + i" class="am-fp-guide" :class="g.axis === 'x' ? 'am-fp-guide--x' : 'am-fp-guide--y'"
                :style="g.axis === 'x' ? { left: g.at + 'px' } : { top: g.at + 'px' }"></div>
            </div>
            <!-- Kontrol zoom (mode edit) -->
            <div v-if="editLayout" class="am-zoom" @pointerdown.stop>
              <button type="button" title="Perkecil (Ctrl −)" @click="zoomBy(1 / 1.2)"><i class="mdi mdi-minus"></i></button>
              <button type="button" class="am-zoom-pct" title="Zoom 100% (Ctrl+1)" @click="zoomTo(1)">{{ Math.round(canvasScale * 100) }}%</button>
              <button type="button" title="Perbesar (Ctrl +)" @click="zoomBy(1.2)"><i class="mdi mdi-plus"></i></button>
              <span class="am-zoom-sep"></span>
              <button type="button" title="Muat layar (Ctrl+0)" @click="fitView"><i class="mdi mdi-fit-to-screen-outline"></i></button>
              <button type="button" :title="fullscreen ? 'Keluar layar penuh (F)' : 'Layar penuh (F)'" @click="fullscreen = !fullscreen"><i class="mdi" :class="fullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"></i></button>
              <span class="am-zoom-sep"></span>
              <button type="button" :class="{ on: snapOn }" title="Auto-join jalan (magnet)" @click="snapOn = !snapOn"><i class="mdi mdi-magnet"></i></button>
            </div>
          </div>

          <div v-if="editLayout && unplaced.length" class="am-tray">
            <div class="am-tray-label"><i class="mdi mdi-tray-arrow-up"></i> Belum di denah ({{ unplaced.length }})</div>
            <button v-for="m in unplaced" :key="m.id" type="button" class="am-tray-chip" @click="place(m)">{{ m.machine }}</button>
          </div>

          <!-- Legenda -->
          <div class="am-legend">
            <div class="am-legend-grp">
              <span class="am-legend-title">Area</span>
              <span class="am-legend-item"><span class="am-legend-sw" :style="{ background: getColor(selected.area_code).border }"></span> {{ selected.area_code }}</span>
            </div>
            <div class="am-legend-grp">
              <span class="am-legend-title">Status mesin</span>
              <span v-for="(st, k) in MACHINE_STATUS" :key="k" class="am-legend-item" :title="st.hint">
                <span class="am-legend-mc" :class="`am-st--${k}`"><span></span></span>
                {{ st.label }} <b>{{ statusCount[k] }}</b>
              </span>
            </div>
            <div v-if="legendRoads.length" class="am-legend-grp">
              <span class="am-legend-title">Jalan</span>
              <span v-for="k in legendRoads" :key="k" class="am-legend-item">
                <span class="am-fp-swatch am-fp-road--h" :class="`am-fp-road--${k}`"></span> {{ ROAD_KINDS[k].label }}
              </span>
            </div>
            <div v-if="legendMarks.length" class="am-legend-grp">
              <span class="am-legend-title">Titik</span>
              <span v-for="k in legendMarks" :key="k" class="am-legend-item">
                <span v-if="!MARK_KINDS[k].flow" class="am-fp-svg" v-html="markSvg(k, 18)"></span><b v-if="MARK_KINDS[k].flow" :style="{ color: MARK_KINDS[k].color }">{{ MARK_KINDS[k].flow }}</b> {{ MARK_KINDS[k].label }}
              </span>
            </div>
            <div v-if="fp.regions.length" class="am-legend-grp">
              <span class="am-legend-title">Wilayah</span>
              <span v-for="r in fp.regions" :key="r.id" class="am-legend-item">
                <span class="am-legend-sw am-legend-sw--region" :style="{ background: REGION_TONES[r.tone].fill, borderColor: REGION_TONES[r.tone].border }"></span> {{ r.label || 'Wilayah' }}
              </span>
            </div>
          </div>
        </div>

        <!-- ══ Tab DAFTAR MESIN ══ -->
        <div v-else class="am-list">
          <form class="am-add" @submit.prevent="addMachine">
            <select v-if="zones.length > 1" v-model="addForm.zone" class="am-select" required title="Area lama (kompatibilitas data)">
              <option value="" disabled>area lama</option>
              <option v-for="z in zones" :key="z" :value="z">{{ z }}</option>
            </select>
            <input v-model.trim="addForm.machine" class="am-input am-input--code" :placeholder="isStamping ? 'kode (A1, 150T)' : 'kode (A1, RSW11)'" required maxlength="20">
            <input v-model.trim="addForm.machine_name" class="am-input" placeholder="nama mesin (opsional)" maxlength="100">
            <button class="am-btn am-btn--primary" :disabled="addingMachine || !addForm.zone || !addForm.machine"><i class="mdi mdi-plus"></i> Tambah Mesin</button>
          </form>

          <div v-if="zones.length" class="am-zone-block">
            <div class="am-zone-head" :style="getStyle(selected.area_code)">
              <span class="am-muted">{{ machines.filter(m => m.is_active).length }}/{{ machines.length }} mesin aktif</span>
            </div>
            <table class="am-table">
              <thead><tr><th>Kode</th><th>Nama</th><th>Grup</th><th class="r">Part</th><template v-if="isStamping"><th>Tipe press</th><th>Tonnage</th><th>Stroke</th><th>Die size</th><th>Dies <span class="am-muted">(slot)</span></th></template><th v-if="isSaArea">Jig <span class="am-muted">(slot robot)</span></th><th>Posisi (x, y)</th><th class="c">Aktif</th></tr></thead>
              <tbody>
                <tr v-for="m in machines" :key="m.id" :class="{ 'am-row--off': !m.is_active }">
                  <td class="mono"><strong>{{ m.machine }}</strong></td>
                  <td>{{ m.machine_name || '—' }}</td>
                  <td>{{ m.line_group || '—' }}</td>
                  <td class="r">{{ m.part_count }}</td>
                  <template v-if="isStamping">
                    <td v-for="f in SPEC_FIELDS" :key="f">
                      <input class="am-input am-input--spec" :value="(m as StampingMachine)[f] ?? ''" maxlength="50" :disabled="specBusy === m.id"
                        @change="saveSpec(m as StampingMachine, f, ($event.target as HTMLInputElement).value)">
                    </td>
                    <td>
                      <div class="am-jigs">
                        <span v-for="d in (m as StampingMachine).dies" :key="d.pairing_id" class="am-jig-chip" :title="d.part_number ? 'Part: ' + d.part_number : 'Dies ' + d.code">
                          <strong>{{ d.code }}</strong>
                          <button type="button" class="am-icon-btn am-icon-btn--danger" :disabled="jigBusy" title="Lepas dies" @click="removeDies(m as StampingMachine, d)"><i class="mdi mdi-close"></i></button>
                        </span>
                        <form v-if="diesAdd === m.id" class="am-jig-edit" @submit.prevent="addDies(m as StampingMachine)">
                          <input v-model.trim="diesCode" class="am-input am-input--jig" placeholder="kode dies" maxlength="50" autofocus>
                          <button class="am-icon-btn" :disabled="jigBusy || !diesCode" title="Pasang"><i class="mdi mdi-check"></i></button>
                          <button type="button" class="am-icon-btn" title="Batal" @click="diesAdd = null"><i class="mdi mdi-close"></i></button>
                        </form>
                        <button v-else type="button" class="am-jig-add" title="Pasang dies ke mesin ini" @click="diesAdd = m.id; diesCode = ''"><i class="mdi mdi-plus"></i>dies</button>
                      </div>
                    </td>
                  </template>
                  <td v-if="isSaArea">
                    <div v-if="isRobotSetup(m.area_code, m.machine)" class="am-jigs">
                      <template v-for="j in m.jigs ?? []" :key="j.code">
                        <form v-if="jigEdit && jigEdit.machine === m.machine && jigEdit.code === j.code" class="am-jig-edit" @submit.prevent="saveJigEdit(m)">
                          <input v-model.trim="jigEdit.value" class="am-input am-input--jig" inputmode="numeric" maxlength="10" autofocus>
                          <button class="am-icon-btn" :disabled="jigBusy" title="Simpan nomor"><i class="mdi mdi-check"></i></button>
                          <button type="button" class="am-icon-btn am-icon-btn--danger" :disabled="jigBusy || j.parts.length > 0"
                            :title="j.parts.length ? `Dipakai ${j.parts.length} part — tidak bisa dihapus` : 'Hapus jig'" @click="deleteJig(m, j)"><i class="mdi mdi-delete-outline"></i></button>
                          <button type="button" class="am-icon-btn" title="Batal" @click="jigEdit = null"><i class="mdi mdi-close"></i></button>
                        </form>
                        <button v-else type="button" class="am-jig-chip" :title="(j.parts.length ? 'Dipakai: ' + j.parts.join(', ') : 'Belum dipakai part') + ' — klik untuk sunting'"
                          @click="jigEdit = { machine: m.machine, code: j.code, value: j.code }">
                          <strong>{{ j.code }}</strong><small>{{ j.parts.length }}p</small>
                        </button>
                      </template>
                      <button type="button" class="am-jig-add" :disabled="jigBusy" title="Tambah jig nomor berikutnya" @click="addJig(m)">
                        <i class="mdi mdi-plus"></i>{{ nextJigCode(m.jigs) }}
                      </button>
                    </div>
                    <span v-else class="am-muted">—</span>
                  </td>
                  <td class="mono">{{ m.pos_x === null ? '— belum di denah' : `${m.pos_x}, ${m.pos_y}` }}</td>
                  <td class="c">
                    <label class="am-switch am-switch--sm">
                      <input type="checkbox" :checked="!!m.is_active" :disabled="togglingMachine === m.id" @change="toggleMachine(m)">
                      <span class="am-switch-track"><span class="am-switch-knob"></span></span>
                    </label>
                  </td>
                </tr>
                <tr v-if="!machines.length"><td :colspan="(isSaArea ? 7 : 6) + (isStamping ? 5 : 0)" class="am-muted">Belum ada mesin di area ini.</td></tr>
              </tbody>
            </table>
          </div>
          <div v-if="!zones.length" class="am-status">Area belum terhubung ke data mesin.</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import weldingAreaService, { type WeldingArea, type AreaMachine, type AreaMachineJig, type UnassignedZone, nextJigCode } from '@/services/Public/Welding/weldingAreaService'
import machineMapService from '@/services/Public/Welding/machineMapService'
import { isRobotSetup } from '@/composables/useWeldingAreas'
import machineMasterService from '@/services/Public/Welding/machineMasterService'
import { useAreaColor, AREA_TYPE_LEGEND } from '@/composables/useAreaColor'
import {
  type FloorPlan, type FpRect, type FpRegion, type FpRoad, type FpMark, type RoadKind, type MarkKind, type RegionTone, type Dir, type FlowSide, FLOW_DIRS, type MachineStatus,
  MACHINE_STATUS, REGION_TONES, ROAD_KINDS, MARK_KINDS, markSize, markSvg, machineStatus, parseFloorPlan, fpId,
} from '@/composables/useFloorPlan'
import { useAuthStore } from '@/stores/auth'
import stampingAreaService, { type StampingArea, type StampingMachine, type StampingDies, type StampingSpec } from '@/services/Public/Stamping/stampingAreaService'

const { getStyle, getColor } = useAreaColor()
const auth = useAuthStore()
const user = () => auth.user?.username || 'SYSTEM'
// Satu halaman untuk 2 master: welding (default) & stamping (lewat area-machine-stamping.vue).
const props = withDefaults(defineProps<{ kind?: 'welding' | 'stamping' }>(), { kind: 'welding' })
const isStamping = props.kind === 'stamping'
type AreaRow = WeldingArea | StampingArea
const zonesOf = (a: AreaRow) => ('zones' in a ? a.zones : [])

// ── Area ──
const areas = ref<AreaRow[]>([])
const loading = ref(false)
const loadError = ref('')
const selected = ref<AreaRow | null>(null)
const togglingArea = ref<number | null>(null)
const areaGroups = computed(() => {
  const groups: { label: string; match: (a: AreaRow) => boolean }[] = isStamping
    ? [{ label: 'INHOUSE', match: () => true }]
    : (['ADM', 'MMKI', 'HMMI'] as const).map(p => ({ label: p, match: (a: AreaRow) => (a as WeldingArea).plant === p }))
  return groups.map(g => ({ label: g.label, items: areas.value.filter(g.match) })).filter(g => g.items.length)
})

async function loadAreas() {
  loading.value = true; loadError.value = ''
  try {
    areas.value = isStamping ? await stampingAreaService.list() : await weldingAreaService.list()
    const keep = selected.value ? areas.value.find(a => a.id === selected.value!.id) : null
    selected.value = keep ?? areas.value.find(a => a.area_code === (isStamping ? 'LINE A' : 'SA ADM')) ?? areas.value[0] ?? null
  } catch (e: any) {
    loadError.value = e?.response?.data?.message ?? 'Gagal memuat area.'
  } finally { loading.value = false }
}
async function seedAreas() {
  loading.value = true
  try { await weldingAreaService.seed(); await loadAreas() }
  catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal seed area.') }
  finally { loading.value = false }
}
function selectArea(a: AreaRow) {
  if (editLayout.value && !confirm('Perubahan denah belum disimpan. Pindah area?')) return
  editLayout.value = false
  selected.value = a
}
async function toggleArea(a: AreaRow) {
  togglingArea.value = a.id
  try {
    const r = await (isStamping ? stampingAreaService : weldingAreaService).toggleActive(a.id)
    a.is_active = r.is_active ?? (a.is_active ? 0 : 1)
  } catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal ubah status area.') }
  finally { togglingArea.value = null }
}

// ── Zone ──
const unassigned = ref<UnassignedZone[]>([])
const zoneToAdd = ref('')
const savingZones = ref(false)
async function loadUnassigned() { if (isStamping) return; try { unassigned.value = await weldingAreaService.unassignedZones() } catch { unassigned.value = [] } }
async function saveZones(zones: string[]) {
  if (!selected.value) return
  savingZones.value = true
  try {
    await weldingAreaService.setZones(selected.value.area_code, zones)
    await Promise.all([loadAreas(), loadUnassigned()])
    await loadMachines()
  } catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal simpan zone.') }
  finally { savingZones.value = false; zoneToAdd.value = '' }
}
function addZone() { if (zoneToAdd.value && selected.value) saveZones([...zonesOf(selected.value).map(z => z.zone), zoneToAdd.value]) }
function removeZone(zone: string) {
  if (!selected.value) return
  if (!confirm(`Lepas zone "${zone}" dari ${selected.value.area_code}? Mesin & part zone ini tetap ada, hanya tidak lagi tampil di area ini.`)) return
  saveZones(zonesOf(selected.value).map(z => z.zone).filter(z => z !== zone))
}

// ── Mesin ──
const tab = ref<'layout' | 'list'>('layout')
const zones = ref<string[]>([])
const machines = ref<AreaMachine[]>([])
const machinesLoading = ref(false)
const togglingMachine = ref<number | null>(null)
const machinesOf = (z: string) => machines.value.filter(m => m.area_code === z)
// ── JIG mesin robot (area SA): nomor 1, 2, 3, ... — tambah, sunting (part ikut pindah), hapus ──
const isSaArea = computed(() => (selected.value?.area_code ?? '').startsWith('SA '))
const jigEdit = ref<{ machine: string; code: string; value: string } | null>(null)
const jigBusy = ref(false)
async function jigCall(fn: () => Promise<{ success: boolean; message: string }>) {
  jigBusy.value = true
  try {
    const res = await fn()
    if (!res.success) { alert(res.message || 'Gagal menyimpan jig.'); return false }
    return true
  } catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal menyimpan jig.'); return false }
  finally { jigBusy.value = false }
}
async function addJig(m: AreaMachine) {
  const code = nextJigCode(m.jigs)
  if (await jigCall(() => machineMapService.saveJig({ area_scope: m.area_code, machine: m.machine, jig_code: code, is_active: true, sort_order: Number(code) })))
    await loadMachines()
}
async function saveJigEdit(m: AreaMachine) {
  const e = jigEdit.value
  if (!e) return
  const j = (m.jigs ?? []).find(x => x.code === e.code)
  if (!j || !e.value || e.value === e.code) { jigEdit.value = null; return }
  if (!j.id) { alert('Jig ini belum ada di master jig — segarkan halaman lalu coba lagi.'); return }
  if (j.parts.length && !confirm(`Ganti jig ${e.code} → ${e.value} di ${m.machine}? ${j.parts.length} part ikut pindah ke jig ${e.value}.`)) return
  if (await jigCall(() => machineMapService.renameJig(j.id as number, e.value))) { jigEdit.value = null; await loadMachines() }
}
async function deleteJig(m: AreaMachine, j: AreaMachineJig) {
  if (!j.id || !confirm(`Hapus jig ${j.code} dari ${m.machine}?`)) return
  if (await jigCall(() => machineMapService.deleteJig(j.id as number))) { jigEdit.value = null; await loadMachines() }
}

const zoneShort = (z: string) => z.replace('ROBOT ', 'R.').replace('SA MANUAL', 'MANUAL')

// ── Spec press & slot DIES (khusus stamping) ──
const SPEC_FIELDS = ['press_type', 'tonnage', 'stroke', 'die_size'] as const
const specBusy = ref<number | null>(null)
async function saveSpec(m: StampingMachine, f: keyof StampingSpec, v: string) {
  specBusy.value = m.id
  try { await stampingAreaService.saveSpec(m.id, { [f]: v.trim() }); m[f] = v.trim() || null }
  catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal simpan spec.') }
  finally { specBusy.value = null }
}
const diesAdd = ref<number | null>(null)
const diesCode = ref('')
async function addDies(m: StampingMachine) {
  if (await jigCall(() => stampingAreaService.addDies(m.id, diesCode.value))) { diesAdd.value = null; await loadMachines() }
}
async function removeDies(m: StampingMachine, d: StampingDies) {
  if (!confirm(`Lepas dies ${d.code} dari ${m.machine}? Master dies tetap ada.`)) return
  if (await jigCall(() => stampingAreaService.removeDies(d.pairing_id))) await loadMachines()
}

async function loadMachines() {
  if (!selected.value) { zones.value = []; machines.value = []; return }
  machinesLoading.value = true
  try {
    if (isStamping) {
      machines.value = await stampingAreaService.machines(selected.value.area_code)
      zones.value = [(selected.value as StampingArea).source_area]
    } else {
      const r = await weldingAreaService.machines(selected.value.area_code)
      zones.value = r.zones; machines.value = r.machines
    }
    if (!zones.value.includes(addForm.zone)) addForm.zone = zones.value[0] ?? ''
  } catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal memuat mesin.') }
  finally { machinesLoading.value = false; nextTick(fitCanvas) }
}
watch(() => selected.value?.id, () => {
  if (selected.value) { canvasW.value = selected.value.layout_w; canvasH.value = selected.value.layout_h }
  loadMachines()
})

async function toggleMachine(m: AreaMachine) {
  togglingMachine.value = m.id
  try {
    await machineMasterService.toggleActive(m.id, user())
    m.is_active = m.is_active ? 0 : 1
    const a = areas.value.find(x => x.id === selected.value?.id)
    if (a) a.machine_active += m.is_active ? 1 : -1
  } catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal ubah status mesin.') }
  finally { togglingMachine.value = null }
}

const addForm = reactive({ zone: '', machine: '', machine_name: '' })
const addingMachine = ref(false)
async function addMachine() {
  addingMachine.value = true
  try {
    const stamp = isStamping ? { process: 'PRESS' as const, line_group: (selected.value as StampingArea).line_group } : {}
    const r = await machineMasterService.store({ area_code: addForm.zone, machine: addForm.machine.toUpperCase(), machine_name: addForm.machine_name || null, ...stamp }, user())
    if (r.status !== 'success') throw new Error(r.message)
    addForm.machine = ''; addForm.machine_name = ''
    await Promise.all([loadMachines(), loadAreas()])
  } catch (e: any) { alert(e?.response?.data?.message ?? e?.message ?? 'Gagal tambah mesin.') }
  finally { addingMachine.value = false }
}

// ── Denah 2D ──
const GRID = 10
// Ukuran kotak mesin (disimpan di layout_json.mcScale). Ganti ukuran = jarak antar mesin ikut direntangkan.
const MC_SIZES = [{ k: 1, label: 'S' }, { k: 1.3, label: 'M' }, { k: 1.6, label: 'L' }]
const mcScale = computed(() => fp.value.mcScale ?? 1)
const mcW = computed(() => Math.floor(76 * mcScale.value)), mcH = computed(() => Math.floor(44 * mcScale.value))
const canvasW = ref(1200), canvasH = ref(640)
const canvasWrap = ref<HTMLElement | null>(null)
const canvasScale = ref(1)
const editLayout = ref(false)
const savingLayout = ref(false)
let snapshot: { id: number; pos_x: number | null; pos_y: number | null }[] = []
let fpSnapshot = ''

const placed = computed(() => machines.value.filter(m => m.pos_x !== null && m.pos_y !== null))
const unplaced = computed(() => machines.value.filter(m => m.pos_x === null || m.pos_y === null))

// Elemen denah (wilayah / jalan / titik / kompas) — ms_welding_area.layout_json
const fp = ref<FloorPlan>(parseFloorPlan(null))
const selId = ref<string | null>(null)
watch(() => selected.value?.id, () => { fp.value = parseFloorPlan(selected.value?.layout_json); selId.value = null }, { immediate: true })

// Warna kotak mesin = status (bukan area)
const statusCount = computed(() => {
  const c: Record<MachineStatus, number> = { run: 0, idle: 0, off: 0 }
  for (const m of machines.value) c[machineStatus(m)]++
  return c
})
const legendRoads = computed(() => (Object.keys(ROAD_KINDS) as RoadKind[]).filter(k => editLayout.value || fp.value.roads.some(r => r.kind === k)))
const legendMarks = computed(() => (Object.keys(MARK_KINDS) as MarkKind[]).filter(k => fp.value.marks.some(m => m.kind === k)))
const rectStyle = (r: Omit<FpRect, 'id'>) => ({ left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' })

// ── Viewport ala Figma (mode edit): zoom Ctrl+scroll / tombol, geser Space+drag / klik tengah / scroll ──
const panX = ref(0), panY = ref(0)
const fullscreen = ref(false)
const spaceDown = ref(false)
const snapOn = ref(true)
const ZMIN = 0.1, ZMAX = 4
function fitCanvas() {
  if (fp.value.auto && !drag.value) autoSize()
  if (editLayout.value) return
  panX.value = 0; panY.value = 0
  const w = canvasWrap.value?.clientWidth ?? 0
  canvasScale.value = w && w < canvasW.value ? Math.max(0.3, w / canvasW.value) : 1
}
/** Muat seluruh kanvas di viewport, rata tengah. */
function fitView() {
  const el = canvasWrap.value; if (!el) return
  const W = el.clientWidth, H = el.clientHeight, pad = 24
  const z = Math.min(ZMAX, Math.max(ZMIN, Math.min((W - pad * 2) / canvasW.value, (H - pad * 2) / canvasH.value)))
  canvasScale.value = z
  panX.value = (W - canvasW.value * z) / 2; panY.value = (H - canvasH.value * z) / 2
}
/** Zoom dengan titik jangkar (koordinat layar relatif viewport) tetap di tempat. */
function zoomAt(z: number, ax: number, ay: number) {
  const nz = Math.min(ZMAX, Math.max(ZMIN, z)), k = nz / canvasScale.value
  panX.value = ax - (ax - panX.value) * k; panY.value = ay - (ay - panY.value) * k
  canvasScale.value = nz
}
const viewCenter = () => ({ x: (canvasWrap.value?.clientWidth ?? 0) / 2, y: (canvasWrap.value?.clientHeight ?? 0) / 2 })
function zoomBy(f: number) { const c = viewCenter(); zoomAt(canvasScale.value * f, c.x, c.y) }
function zoomTo(z: number) { const c = viewCenter(); zoomAt(z, c.x, c.y) }
function onWheel(e: WheelEvent) {
  if (!editLayout.value) return
  e.preventDefault()
  if (e.ctrlKey || e.metaKey) {
    const r = canvasWrap.value!.getBoundingClientRect()
    zoomAt(canvasScale.value * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
  } else if (e.shiftKey) { panX.value -= e.deltaY || e.deltaX }
  else { panX.value -= e.deltaX; panY.value -= e.deltaY }
}
function onWrapDownCapture(e: PointerEvent) {
  if (!editLayout.value) return
  if (e.button === 1 || (e.button === 0 && spaceDown.value)) {
    e.preventDefault(); e.stopPropagation()
    drag.value = { kind: 'pan', sx: e.clientX, sy: e.clientY, px: panX.value, py: panY.value }
    canvasWrap.value!.setPointerCapture(e.pointerId)
  }
}
function onKeyUp(e: KeyboardEvent) { if (e.code === 'Space') spaceDown.value = false }
watch(editLayout, on => { nextTick(() => (on ? fitView() : fitCanvas())); if (!on) fullscreen.value = false })
watch(fullscreen, () => nextTick(fitView))
watch([canvasW, canvasH], () => nextTick(fitCanvas))
// ── Undo / redo (Ctrl+Z / Ctrl+Y) — snapshot posisi mesin + elemen denah + ukuran kanvas ──
const undoStack: string[] = [], redoStack: string[] = []
const histTick = ref(0)
const stateJson = () => JSON.stringify({ m: machines.value.map(m => [m.id, m.pos_x, m.pos_y]), fp: fp.value, w: canvasW.value, h: canvasH.value })
function applyState(json: string) {
  const st = JSON.parse(json) as { m: [number, number | null, number | null][]; fp: FloorPlan; w: number; h: number }
  const pos = new Map(st.m.map(([id, x, y]) => [id, [x, y] as const]))
  for (const m of machines.value) { const p = pos.get(m.id); if (p) { m.pos_x = p[0]; m.pos_y = p[1] } }
  fp.value = parseFloorPlan(st.fp); canvasW.value = st.w; canvasH.value = st.h
  clearSel()
}
/** Panggil SEBELUM mengubah denah. Tidak menumpuk bila state sama dgn puncak stack. */
function record() {
  if (!editLayout.value) return
  const cur = stateJson()
  if (undoStack[undoStack.length - 1] === cur) return
  undoStack.push(cur); if (undoStack.length > 100) undoStack.shift()
  redoStack.length = 0; histTick.value++
}
function undo() {
  const cur = stateJson()
  while (undoStack.length && undoStack[undoStack.length - 1] === cur) undoStack.pop()
  const prev = undoStack.pop(); if (!prev) return
  redoStack.push(cur); applyState(prev); histTick.value++
}
function redo() {
  const next = redoStack.pop(); if (!next) return
  undoStack.push(stateJson()); applyState(next); histTick.value++
}
const canUndo = computed(() => (histTick.value, undoStack.length > 0))
const canRedo = computed(() => (histTick.value, redoStack.length > 0))

// ── IN/OUT pallet per mesin ──
const selMachineIds = computed(() => [...multiSel.value].filter(k => k.startsWith('m:')).map(k => k.slice(2)))
const DIRS: Dir[] = [0, 90, 180, 270]
/** Arah bersama di mesin terpilih (undefined bila belum terpasang / beda-beda). */
function flowDirOf(k: 'in' | 'out'): Dir | undefined {
  const ds = new Set(selMachineIds.value.map(id => { const m = machineById(id); return m ? flowView(m)?.[k] : undefined }))
  return ds.size === 1 ? [...ds][0] : undefined
}
/** Sisi mesin yang paling dekat ke jalur pallet (dipakai side 'auto'); tanpa jalur pallet → bawah. */
function nearestPalletSide(m: AreaMachine): Exclude<FlowSide, 'auto'> {
  const x0 = m.pos_x ?? 0, y0 = m.pos_y ?? 0, x1 = x0 + mcW.value, y1 = y0 + mcH.value
  let best: Exclude<FlowSide, 'auto'> = 'bottom', bd = Infinity
  for (const r of fp.value.roads.filter(r => r.kind === 'forklift')) {
    const ox = r.x < x1 && r.x + r.w > x0, oy = r.y < y1 && r.y + r.h > y0
    const c: [Exclude<FlowSide, 'auto'>, number][] = []
    if (ox && r.y + r.h <= y0 + 1) c.push(['top', y0 - (r.y + r.h)])
    if (ox && r.y >= y1 - 1) c.push(['bottom', r.y - y1])
    if (oy && r.x + r.w <= x0 + 1) c.push(['left', x0 - (r.x + r.w)])
    if (oy && r.x >= x1 - 1) c.push(['right', r.x - x1])
    for (const [side, d] of c) if (d < bd) { bd = d; best = side }
  }
  return best
}
/** Sisi & arah efektif badge IN/OUT satu mesin. */
function flowView(m: AreaMachine) {
  const f = fp.value.mcFlow[m.id]; if (!f) return null
  const side = !f.side || f.side === 'auto' ? nearestPalletSide(m) : f.side
  const auto = !f.side || f.side === 'auto'
  return { side, in: f.in === undefined ? undefined : auto ? FLOW_DIRS[side].in : f.in, out: f.out === undefined ? undefined : auto ? FLOW_DIRS[side].out : f.out }
}
const machineById = (id: string) => machines.value.find(m => String(m.id) === id)
/** Klik pertama = pasang (arah otomatis sesuai sisi); klik berikut = putar 90° (sisi dikunci ke sisi sekarang). */
function flowStep(k: 'in' | 'out') {
  const ids = selMachineIds.value; if (!ids.length) return
  record()
  const installed = ids.every(id => fp.value.mcFlow[id]?.[k] !== undefined)
  for (const id of ids) {
    const m = machineById(id); if (!m) continue
    const f = fp.value.mcFlow[id] ?? { side: 'auto' as FlowSide }
    if (!installed) {
      const side = f.side ?? 'auto'
      fp.value.mcFlow[id] = { ...f, side, [k]: side === 'auto' ? 0 : FLOW_DIRS[side][k] }   // 'auto': arah dihitung saat render
      continue
    }
    const v = flowView(m)!, cur = v[k] ?? 0
    fp.value.mcFlow[id] = { ...f, in: f.in === undefined ? undefined : v.in, out: f.out === undefined ? undefined : v.out, side: v.side, [k]: DIRS[(DIRS.indexOf(cur) + 1) % 4] }
  }
}
const FLOW_SIDES: { k: FlowSide; icon: string; title: string }[] = [
  { k: 'auto', icon: 'mdi-magnet', title: 'Auto: sisi terdekat jalur pallet' },
  { k: 'top', icon: 'mdi-arrow-up', title: 'Atas' }, { k: 'bottom', icon: 'mdi-arrow-down', title: 'Bawah' },
  { k: 'left', icon: 'mdi-arrow-left', title: 'Kiri' }, { k: 'right', icon: 'mdi-arrow-right', title: 'Kanan' },
]
/** Sisi bersama mesin terpilih (untuk highlight tombol). */
const selFlowSide = computed(() => {
  const ss = new Set(selMachineIds.value.map(id => fp.value.mcFlow[id]?.side ?? 'auto'))
  return ss.size === 1 ? [...ss][0] : null
})
/** Pindah sisi badge; arah panah di-reset ke default sisi tsb. Mesin tanpa IN/OUT dapat keduanya. */
function setFlowSide(side: FlowSide) {
  const ids = selMachineIds.value; if (!ids.length) return
  record()
  for (const id of ids) {
    const f = fp.value.mcFlow[id] ?? { in: 0 as Dir, out: 0 as Dir }
    const d = side === 'auto' ? { in: 0 as Dir, out: 0 as Dir } : FLOW_DIRS[side]
    fp.value.mcFlow[id] = { side, in: f.in === undefined ? undefined : d.in, out: f.out === undefined ? undefined : d.out }
  }
}
function clearFlow() {
  record()
  for (const id of selMachineIds.value) delete fp.value.mcFlow[id]
}
function selectAllMachines() { setSel(placed.value.map(mcKey)) }

// ── Salin / tempel (Ctrl+C / Ctrl+V) elemen denah; tempel di posisi kursor ──
type Clip = { n: number; regions: FpRegion[]; roads: FpRoad[]; marks: FpMark[]; x: number; y: number }
const clipboard = ref<Clip | null>(null)
let pasteCount = 0
const lastPointer = ref<{ x: number; y: number } | null>(null)
function copySel() {
  const keys = new Set([...multiSel.value, ...(selId.value ? [selId.value] : [])])
  const pick = <T extends { id: string }>(l: T[]) => l.filter(x => keys.has(x.id)).map(x => JSON.parse(JSON.stringify(x)) as T)
  const c = { regions: pick(fp.value.regions), roads: pick(fp.value.roads), marks: pick(fp.value.marks) }
  const all = [...c.regions, ...c.roads, ...c.marks]
  if (!all.length) return
  clipboard.value = { ...c, n: all.length, x: Math.min(...all.map(a => a.x)), y: Math.min(...all.map(a => a.y)) }
  pasteCount = 0
}
function pasteClip(atCursor = false) {
  const c = clipboard.value; if (!c) return
  record()
  pasteCount++
  // Di kursor bila ada, selain itu geser bertahap 20px per tempel.
  const tx = atCursor && lastPointer.value ? snap(lastPointer.value.x) : c.x + GRID * 2 * pasteCount
  const ty = atCursor && lastPointer.value ? snap(lastPointer.value.y) : c.y + GRID * 2 * pasteCount
  const ids: string[] = []
  const clone = <T extends { id: string; x: number; y: number }>(l: T[]) =>
    l.map(x => { const n = { ...JSON.parse(JSON.stringify(x)), id: fpId(), x: Math.max(0, x.x - c.x + tx), y: Math.max(0, x.y - c.y + ty) } as T; ids.push(n.id); return n })
  fp.value.regions.push(...clone(c.regions)); fp.value.roads.push(...clone(c.roads)); fp.value.marks.push(...clone(c.marks))
  setSel(ids)
}

/** Duplikat elemen denah terpilih (mesin tidak bisa diduplikat). */
function duplicateSel() {
  const keys = new Set([...multiSel.value, ...(selId.value ? [selId.value] : [])])
  const off = GRID * 2, ids: string[] = []
  const dup = <T extends { id: string; x: number; y: number }>(list: T[]) =>
    list.filter(x => keys.has(x.id)).map(x => { const c = { ...x, id: fpId(), x: x.x + off, y: x.y + off }; ids.push(c.id); return c })
  if (![...keys].some(k => !k.startsWith('m:'))) return
  record()
  fp.value.regions.push(...dup(fp.value.regions)); fp.value.roads.push(...dup(fp.value.roads)); fp.value.marks.push(...dup(fp.value.marks))
  setSel(ids)
}
/** Geser item terpilih dengan panah (Shift = 5 grid). */
function nudge(dx: number, dy: number) {
  const list = movables().filter(v => multiSel.value.has(v.key))
  if (!list.length) return
  record()
  for (const v of list) { const p = posOf(v.obj); setPos(v.obj, clampX(p.x + dx, v.w), clampY(p.y + dy, v.h)) }
}

function onKey(e: KeyboardEvent) {
  if (!editLayout.value) return
  const tag = (e.target as HTMLElement)?.tagName
  const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA'
  const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase()
  if (ctrl && k === 's') { e.preventDefault(); saveLayout(); return }
  if (typing) return
  if (e.code === 'Space') { e.preventDefault(); spaceDown.value = true; return }
  if (ctrl && (k === '=' || k === '+')) { e.preventDefault(); zoomBy(1.2); return }
  if (ctrl && k === '-') { e.preventDefault(); zoomBy(1 / 1.2); return }
  if (ctrl && k === '0') { e.preventDefault(); fitView(); return }
  if (ctrl && k === '1') { e.preventDefault(); zoomTo(1); return }
  if (!ctrl && k === 'f') { fullscreen.value = !fullscreen.value; return }
  if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
  else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
  else if (ctrl && k === 'a') { e.preventDefault(); setSel(movables().map(v => v.key)) }
  else if (ctrl && k === 'd') { e.preventDefault(); duplicateSel() }
  else if (ctrl && k === 'c') { e.preventDefault(); copySel() }
  else if (ctrl && k === 'x') { e.preventDefault(); copySel(); removeSelected() }
  else if (ctrl && k === 'v') { e.preventDefault(); pasteClip(true) }
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSelected() }
  else if (e.key === 'Escape') clearSel()
  else if (e.key.startsWith('Arrow')) {
    e.preventDefault()
    const st = GRID * (e.shiftKey ? 5 : 1)
    nudge(e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0, e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0)
  }
}
onMounted(() => { window.addEventListener('resize', fitCanvas); window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKeyUp); loadAreas().then(() => loadUnassigned()) })
onBeforeUnmount(() => { window.removeEventListener('resize', fitCanvas); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp) })

function enterEditLayout() {
  snapshot = machines.value.map(m => ({ id: m.id, pos_x: m.pos_x, pos_y: m.pos_y }))
  fpSnapshot = JSON.stringify(fp.value)
  clearSel()
  undoStack.length = 0; redoStack.length = 0; histTick.value++
  editLayout.value = true
}
function cancelEditLayout() {
  for (const s of snapshot) { const m = machines.value.find(x => x.id === s.id); if (m) { m.pos_x = s.pos_x; m.pos_y = s.pos_y } }
  if (selected.value) { canvasW.value = selected.value.layout_w; canvasH.value = selected.value.layout_h }
  fp.value = parseFloorPlan(fpSnapshot)
  clearSel()
  editLayout.value = false
}
const snap = (v: number) => Math.round(v / GRID) * GRID
// Batas geser: kanvas auto = hanya >= 0 (kanvas ikut membesar); manual = di dalam kanvas.
const limW = computed(() => (fp.value.auto ? Infinity : canvasW.value))
const limH = computed(() => (fp.value.auto ? Infinity : canvasH.value))
const clampX = (x: number, w = mcW.value) => Math.min(Math.max(0, x), limW.value - w)
const clampY = (y: number, h = mcH.value) => Math.min(Math.max(0, y), limH.value - h)

/** Slot kosong pertama dalam grid kolom (dipakai "Tempatkan" & susun otomatis). */
function freeSlot(taken: AreaMachine[]): { x: number; y: number } {
  const cols = Math.max(1, Math.floor((canvasW.value - 20) / (mcW.value + 14)))
  for (let i = 0; i < 10000; i++) {
    const x = 20 + (i % cols) * (mcW.value + 14), y = 20 + Math.floor(i / cols) * (mcH.value + 14)
    if (y > canvasH.value - mcH.value) return { x, y: canvasH.value - mcH.value }
    if (!taken.some(m => Math.abs((m.pos_x ?? -999) - x) < mcW.value && Math.abs((m.pos_y ?? -999) - y) < mcH.value)) return { x, y }
  }
  return { x: 20, y: 20 }
}
function place(m: AreaMachine) { record(); const s = freeSlot(placed.value); m.pos_x = s.x; m.pos_y = s.y }
function unplace(m: AreaMachine) { record(); m.pos_x = null; m.pos_y = null }

/** Susun per zone: tiap zone 1 blok baris, mesin urut grup/nomor. */
function autoArrange() {
  record()
  const cols = Math.max(1, Math.floor((canvasW.value - 20) / (mcW.value + 14)))
  let y = 20
  for (const z of zones.value) {
    const list = machinesOf(z)
    list.forEach((m, i) => { m.pos_x = 20 + (i % cols) * (mcW.value + 14); m.pos_y = y + Math.floor(i / cols) * (mcH.value + 14) })
    if (list.length) y += Math.ceil(list.length / cols) * (mcH.value + 14) + 30
  }
  if (y > canvasH.value) canvasH.value = Math.ceil(y / 50) * 50
}

// ── Tambah / pilih / hapus elemen denah ──
type SelEl = { type: 'region'; item: FpRegion } | { type: 'road'; item: FpRoad } | { type: 'mark'; item: FpMark }
const selEl = computed<SelEl | null>(() => {
  const id = selId.value
  if (!id) return null
  const r = fp.value.regions.find(x => x.id === id); if (r) return { type: 'region', item: r }
  const d = fp.value.roads.find(x => x.id === id); if (d) return { type: 'road', item: d }
  const m = fp.value.marks.find(x => x.id === id); if (m) return { type: 'mark', item: m }
  return null
})
function addRegion(tone: RegionTone = 'slate') {
  record()
  const n = fp.value.regions.length + 1
  const r: FpRegion = { id: fpId(), x: 20, y: 20, w: 320, h: 180, label: tone === 'wip' ? 'AREA WIP' : `Wilayah ${n}`, tone }
  fp.value.regions.push(r); setSel([r.id])
}
function addRoad(kind: RoadKind) {
  record()
  const r: FpRoad = { id: fpId(), x: 20, y: snap(canvasH.value / 2), w: Math.min(600, canvasW.value - 40), h: kind === 'forklift' ? 40 : kind === 'conveyor' ? 30 : 24, kind }
  fp.value.roads.push(r); setSel([r.id])
}
function addMark(kind: MarkKind) {
  record()
  const n = fp.value.marks.length, m: FpMark = { id: fpId(), x: 40 + (n % 8) * 80, y: 40 + Math.floor(n / 8 % 4) * 50, kind }
  fp.value.marks.push(m); setSel([m.id])
}
function rotateRoad(r: FpRoad) { record(); [r.w, r.h] = [r.h, r.w]; r.x = clampX(r.x, r.w); r.y = clampY(r.y, r.h) }
function rotateMarkDir(m: FpMark) { record(); m.dir = (((m.dir ?? 0) + 90) % 360) as FpMark['dir'] }
/** Ubah ukuran mesin; posisi mesin direntangkan dari pojok kiri-atas blok mesin supaya tidak bertumpuk. */
function setMcScale(k: number) {
  const old = mcScale.value; if (k === old) return
  record()
  // Skala SELURUH denah (mesin, jalan, wilayah, titik) dari titik (0,0) → tatanan tetap sama, hanya lebih besar.
  const r = k / old, sc = (v: number) => Math.round(v * r)
  for (const m of placed.value) { m.pos_x = Math.ceil(m.pos_x! * r); m.pos_y = Math.ceil(m.pos_y! * r) }
  for (const el of [...fp.value.regions, ...fp.value.roads]) { el.x = sc(el.x); el.y = sc(el.y); el.w = sc(el.w); el.h = sc(el.h) }
  for (const mk of fp.value.marks) { mk.x = sc(mk.x); mk.y = sc(mk.y) }
  if (!fp.value.auto) { canvasW.value = sc(canvasW.value); canvasH.value = sc(canvasH.value) }
  fp.value.mcScale = k
  nextTick(fitView)
}
function rotateNorth() { record(); fp.value.north = ((fp.value.north + 90) % 360) as FloorPlan['north'] }

// ── Seleksi banyak (drag kotak di area kosong kanvas, Shift+klik = tambah/kurang) ──
const multiSel = ref<Set<string>>(new Set())   // 'm:<id mesin>' | id elemen denah
const mcKey = (m: AreaMachine) => `m:${m.id}`
const isSel = (key: string) => multiSel.value.has(key) || selId.value === key
function setSel(keys: string[]) {
  multiSel.value = new Set(keys)
  const els = keys.filter(k => !k.startsWith('m:'))
  selId.value = keys.length === 1 && els.length === 1 ? els[0] : null
}
function clearSel() { setSel([]) }
function toggleSel(key: string) {
  const s = new Set(multiSel.value)
  s.has(key) ? s.delete(key) : s.add(key)
  setSel([...s])
}
function removeSelected() {
  record()
  const keys = new Set([...multiSel.value, ...(selId.value ? [selId.value] : [])])
  for (const m of machines.value) if (keys.has(mcKey(m))) unplace(m)
  fp.value.regions = fp.value.regions.filter(x => !keys.has(x.id))
  fp.value.roads = fp.value.roads.filter(x => !keys.has(x.id))
  fp.value.marks = fp.value.marks.filter(x => !keys.has(x.id))
  clearSel()
}
/** Semua item bergerak di kanvas: mesin + elemen denah, dengan ukuran kotaknya. */
type Movable = { key: string; obj: { x: number; y: number } | AreaMachine; w: number; h: number }
function movables(): Movable[] {
  return [
    ...placed.value.map(m => ({ key: mcKey(m), obj: m, w: mcW.value, h: mcH.value })),
    ...fp.value.regions.map(r => ({ key: r.id, obj: r, w: r.w, h: r.h })),
    ...fp.value.roads.map(r => ({ key: r.id, obj: r, w: r.w, h: r.h })),
    ...fp.value.marks.map(r => ({ key: r.id, obj: r, ...markSize(r.kind) })),
  ]
}
const posOf = (o: Movable['obj']) => ('pos_x' in o ? { x: o.pos_x ?? 0, y: o.pos_y ?? 0 } : { x: o.x, y: o.y })
function setPos(o: Movable['obj'], x: number, y: number) {
  if ('pos_x' in o) { o.pos_x = x; o.pos_y = y } else { o.x = x; o.y = y }
}
const selBounds = computed(() => {
  const list = movables().filter(v => multiSel.value.has(v.key))
  if (!list.length) return null
  const ps = list.map(v => ({ ...posOf(v.obj), w: v.w, h: v.h }))
  const x = Math.min(...ps.map(p => p.x)), y = Math.min(...ps.map(p => p.y))
  return { x, y, w: Math.max(...ps.map(p => p.x + p.w)) - x, h: Math.max(...ps.map(p => p.y + p.h)) - y }
})
/** Buat wilayah membungkus item terpilih (padding 20px). */
function regionFromSel() {
  record()
  const b = selBounds.value; if (!b) return
  const pad = 20, x = Math.max(0, b.x - pad), y = Math.max(0, b.y - pad - 10)
  const r: FpRegion = { id: fpId(), x, y, w: Math.min(limW.value - x, b.w + pad * 2), h: Math.min(limH.value - y, b.h + pad * 2 + 10), label: `Wilayah ${fp.value.regions.length + 1}`, tone: 'slate' }
  fp.value.regions.push(r)
  setSel([r.id])
}

// ── Drag: pindah (1 / grup), resize wilayah/jalan, kotak seleksi ──
type Drag =
  | { kind: 'move'; start: { x: number; y: number }; items: { v: Movable; x0: number; y0: number }[]; id?: number }
  | { kind: 'resize'; el: FpRect; dir: Handle; o: { x: number; y: number; w: number; h: number } }
  | { kind: 'box'; x0: number; y0: number; x1: number; y1: number; add: string[] }
  | { kind: 'pan'; sx: number; sy: number; px: number; py: number }
const drag = ref<Drag | null>(null)
const canvasEl = ref<HTMLElement | null>(null)
const toCanvas = (e: PointerEvent) => {
  const r = canvasEl.value!.getBoundingClientRect()
  return { x: (e.clientX - r.left) / canvasScale.value, y: (e.clientY - r.top) / canvasScale.value }
}
function grab(e: PointerEvent, d: Drag) {
  if (d.kind !== 'box' && d.kind !== 'pan') record()
  drag.value = d
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function startMove(e: PointerEvent, key: string) {
  if (e.shiftKey) { toggleSel(key); return }
  if (!multiSel.value.has(key)) setSel([key])
  const keys = multiSel.value
  const items = movables().filter(v => keys.has(v.key)).map(v => ({ v, x0: posOf(v.obj).x, y0: posOf(v.obj).y }))
  grab(e, { kind: 'move', start: toCanvas(e), items, id: key.startsWith('m:') && keys.size === 1 ? Number(key.slice(2)) : undefined })
}
function onDragStart(e: PointerEvent, m: AreaMachine) {
  if (!editLayout.value || e.button !== 0) return
  startMove(e, mcKey(m))
}
function onElDown(e: PointerEvent, el: FpRect | FpMark) {
  if (!editLayout.value || e.button !== 0) return
  e.stopPropagation()
  startMove(e, el.id)
}
/** Handle resize: 4 sudut + 4 sisi (seperti Figma). */
type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
function onResizeDown(e: PointerEvent, el: FpRect, dir: Handle) {
  if (e.button !== 0) return
  setSel([el.id])
  grab(e, { kind: 'resize', el, dir, o: { x: el.x, y: el.y, w: el.w, h: el.h } })
}
function onCanvasDown(e: PointerEvent) {
  if (!editLayout.value || e.button !== 0) { clearSel(); return }
  const p = toCanvas(e)
  const add = e.shiftKey ? [...multiSel.value] : []
  if (!e.shiftKey) clearSel()
  grab(e, { kind: 'box', x0: p.x, y0: p.y, x1: p.x, y1: p.y, add })
}
const boxRect = computed(() => {
  const d = drag.value
  if (d?.kind !== 'box') return null
  return { x: Math.min(d.x0, d.x1), y: Math.min(d.y0, d.y1), w: Math.abs(d.x1 - d.x0), h: Math.abs(d.y1 - d.y0) }
})
function onDragMove(e: PointerEvent) {
  if (canvasEl.value) lastPointer.value = toCanvas(e)
  const d = drag.value
  if (!d) return
  if (d.kind === 'pan') { panX.value = d.px + e.clientX - d.sx; panY.value = d.py + e.clientY - d.sy; return }
  const p = toCanvas(e)
  if (d.kind === 'move') {
    // Geser grup dgn delta yang sama; delta dibatasi supaya semua item tetap di kanvas.
    let dx = snap(p.x - d.start.x), dy = snap(p.y - d.start.y)
    // Auto-join: 1 jalan digeser → tepinya menempel ke tepi jalan lain terdekat.
    const road = d.items.length === 1 ? fp.value.roads.find(r => r.id === d.items[0].v.key) : undefined
    if (road) {
      const s = snapRoad(road, d.items[0].x0 + dx, d.items[0].y0 + dy, road.w, road.h, 'move')
      dx = s.x - d.items[0].x0; dy = s.y - d.items[0].y0
    } else snapGuides.value = []
    for (const it of d.items) {
      dx = Math.min(Math.max(dx, -it.x0), limW.value - it.v.w - it.x0)
      dy = Math.min(Math.max(dy, -it.y0), limH.value - it.v.h - it.y0)
    }
    for (const it of d.items) setPos(it.v.obj, it.x0 + dx, it.y0 + dy)
  } else if (d.kind === 'resize') {
    // Sisi yang ditarik bergerak, sisi seberangnya tetap. Min 2 grid.
    const o = d.o, MIN = GRID * 2
    let x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + o.h
    if (d.dir.includes('w')) x0 = Math.min(Math.max(0, snap(p.x)), x1 - MIN)
    if (d.dir.includes('e')) x1 = Math.max(Math.min(limW.value, snap(p.x)), x0 + MIN)
    if (d.dir.includes('n')) y0 = Math.min(Math.max(0, snap(p.y)), y1 - MIN)
    if (d.dir.includes('s')) y1 = Math.max(Math.min(limH.value, snap(p.y)), y0 + MIN)
    const road = fp.value.roads.find(r => r.id === d.el.id)
    if (road) ({ x0, y0, x1, y1 } = snapRoadEdges(road, x0, y0, x1, y1, d.dir))
    d.el.x = x0; d.el.y = y0; d.el.w = x1 - x0; d.el.h = y1 - y0
  } else {
    d.x1 = p.x; d.y1 = p.y
    const b = boxRect.value!
    // Wilayah hanya ikut bila seluruhnya di dalam kotak (supaya tidak selalu kena); lainnya cukup bersinggungan.
    const hit = movables().filter(v => {
      const { x, y } = posOf(v.obj)
      const regionKey = fp.value.regions.some(r => r.id === v.key)
      return regionKey
        ? x >= b.x && y >= b.y && x + v.w <= b.x + b.w && y + v.h <= b.y + b.h
        : x < b.x + b.w && x + v.w > b.x && y < b.y + b.h && y + v.h > b.y
    }).map(v => v.key)
    setSel([...new Set([...d.add, ...hit])])
  }
}
function onDragEnd() { drag.value = null; snapGuides.value = []; autoSize() }

// ── Auto-join jalan ──
const SNAP = 14, B = 2   // jarak magnet (px layar) & tebal garis tepi jalan
const snapGuides = ref<{ axis: 'x' | 'y'; at: number }[]>([])
/** Tempelkan tepi jalan (x/y saat geser, kanan/bawah saat resize) ke tepi jalan lain dalam jarak SNAP. */
function snapRoad(self: FpRoad, x: number, y: number, w: number, h: number, mode: 'move') {
  const guides: { axis: 'x' | 'y'; at: number }[] = []
  if (!snapOn.value) { snapGuides.value = guides; return { x, y, w, h } }
  const others = fp.value.roads.filter(r => r.id !== self.id)
  const xs = others.flatMap(o => [o.x, o.x + o.w]), ys = others.flatMap(o => [o.y, o.y + o.h])
  const best = (edges: number[], targets: number[]) => {
    let d = Infinity, at = 0
    for (const e of edges) for (const t of targets) if (Math.abs(t - e) < Math.abs(d)) { d = t - e; at = t }
    return Math.abs(d) <= SNAP / canvasScale.value ? { d, at } : null
  }
  if (mode === 'move') {
    const bx = best([x, x + w], xs); if (bx) { x += bx.d; guides.push({ axis: 'x', at: bx.at }) }
    const by = best([y, y + h], ys); if (by) { y += by.d; guides.push({ axis: 'y', at: by.at }) }
  }
  snapGuides.value = guides
  return { x, y, w, h }
}
/** Snap sisi yang sedang di-resize ke tepi jalan lain. */
function snapRoadEdges(self: FpRoad, x0: number, y0: number, x1: number, y1: number, dir: string) {
  const guides: { axis: 'x' | 'y'; at: number }[] = []
  if (snapOn.value) {
    const others = fp.value.roads.filter(r => r.id !== self.id)
    const xs = others.flatMap(o => [o.x, o.x + o.w]), ys = others.flatMap(o => [o.y, o.y + o.h])
    const near = (v: number, ts: number[]) => ts.reduce<number | null>((b, t) => (Math.abs(t - v) <= SNAP / canvasScale.value && (b === null || Math.abs(t - v) < Math.abs(b - v)) ? t : b), null)
    const fix = (v: number, ts: number[], axis: 'x' | 'y') => { const t = near(v, ts); if (t === null) return v; guides.push({ axis, at: t }); return t }
    if (dir.includes('w')) x0 = Math.min(fix(x0, xs, 'x'), x1 - GRID)
    if (dir.includes('e')) x1 = Math.max(fix(x1, xs, 'x'), x0 + GRID)
    if (dir.includes('n')) y0 = Math.min(fix(y0, ys, 'y'), y1 - GRID)
    if (dir.includes('s')) y1 = Math.max(fix(y1, ys, 'y'), y0 + GRID)
  }
  snapGuides.value = guides
  return { x0, y0, x1, y1 }
}
const JOINT_COLOR: Partial<Record<RoadKind, string>> = { forklift: '#64748b', walk: '#86efac' }
/** Tambalan di pertemuan 2 jalan sejenis (T, L, silang, sambung lurus) supaya garis tepinya hilang. */
const roadJoints = computed(() => {
  const out: (Omit<FpRect, 'id'> & { color: string })[] = []
  const push = (x0: number, y0: number, x1: number, y1: number, color: string) => { if (x1 > x0 && y1 > y0) out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, color }) }
  const roads = fp.value.roads
  for (let i = 0; i < roads.length; i++) for (let j = i + 1; j < roads.length; j++) {
    const a = roads[i], b = roads[j], color = JOINT_COLOR[a.kind]
    if (a.kind !== b.kind || !color) continue
    const aH = a.w >= a.h, bH = b.w >= b.h
    if (aH !== bH) {
      const hr = aH ? a : b, v = aH ? b : a
      if (!(v.x < hr.x + hr.w && v.x + v.w > hr.x && v.y <= hr.y + hr.h && v.y + v.h >= hr.y)) continue
      const above = v.y < hr.y, below = v.y + v.h > hr.y + hr.h
      push(v.x + B, above ? hr.y - B : hr.y + B, v.x + v.w - B, below ? hr.y + hr.h + B : hr.y + hr.h - B, color)
      if (v.y < hr.y + hr.h - B && v.y + v.h > hr.y + B)   // silang / masuk ke badan jalan
        push(Math.max(v.x, hr.x + B), hr.y + B, Math.min(v.x + v.w, hr.x + hr.w - B), hr.y + hr.h - B, color)
    } else if (aH) {
      const [l, r] = a.x <= b.x ? [a, b] : [b, a]
      if (Math.abs(l.x + l.w - r.x) <= 1 || (r.x < l.x + l.w && r.x > l.x))
        push(r.x - B, Math.max(l.y, r.y) + B, Math.min(l.x + l.w, r.x + r.w) + B, Math.min(l.y + l.h, r.y + r.h) - B, color)
    } else {
      const [t, u] = a.y <= b.y ? [a, b] : [b, a]
      if (Math.abs(t.y + t.h - u.y) <= 1 || (u.y < t.y + t.h && u.y > t.y))
        push(Math.max(t.x, u.x) + B, u.y - B, Math.min(t.x + t.w, u.x + u.w) - B, Math.min(t.y + t.h, u.y + u.h) + B, color)
    }
  }
  return out
})

// ── Kanvas auto: tepi kanvas = tepi isi terjauh (tanpa padding, supaya item bisa menempel tepi);
//    geser/tarik melewati tepi = kanvas ikut membesar. Lebar minimal = lebar layar, tinggi minimal 240. ──
function autoSize() {
  if (!fp.value.auto || drag.value) return
  const list = movables()
  const maxX = Math.max(0, ...list.map(v => posOf(v.obj).x + v.w)), maxY = Math.max(0, ...list.map(v => posOf(v.obj).y + v.h))
  const wrapW = editLayout.value ? 600 : (canvasWrap.value?.clientWidth ?? 0) - 4
  canvasW.value = Math.max(wrapW > 0 ? wrapW : 0, Math.ceil(maxX / GRID) * GRID)
  canvasH.value = Math.max(240, Math.ceil(maxY / GRID) * GRID)
}
function toggleAutoCanvas() { record(); fp.value.auto = !fp.value.auto; autoSize() }
watch(() => [stateJson(), fp.value.auto], () => autoSize())

async function saveLayout() {
  if (!selected.value) return
  savingLayout.value = true
  try {
    const svc = isStamping ? stampingAreaService : weldingAreaService
    await svc.saveLayout(machines.value.map(m => ({ id: m.id, pos_x: m.pos_x, pos_y: m.pos_y })))
    const fpJson = JSON.stringify(fp.value)
    const patch: { layout_w?: number; layout_h?: number; layout_json?: string } = {}
    if (canvasW.value !== selected.value.layout_w || canvasH.value !== selected.value.layout_h) { patch.layout_w = canvasW.value; patch.layout_h = canvasH.value }
    if (fpJson !== fpSnapshot) patch.layout_json = fpJson
    if (Object.keys(patch).length) {
      await svc.update(selected.value.id, patch)
      Object.assign(selected.value, patch)
    }
    clearSel()
    editLayout.value = false
  } catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal simpan denah.') }
  finally { savingLayout.value = false }
}
</script>

<style scoped>
.am-page { padding: 4px; }
.am-input--spec { width: 84px; padding: 3px 6px !important; font-size: 12px; }
.am-header { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.am-header-icon { width: 44px; height: 44px; border-radius: 10px; background: #2e5396; color: white; display: grid; place-items: center; font-size: 24px; flex-shrink: 0; }
.am-header h1 { font-size: 18px; font-weight: 700; margin: 0; color: var(--wui-text); }
.am-header p { font-size: 12.5px; color: var(--wui-muted); margin: 2px 0 0; }
.am-header-actions { margin-left: auto; display: flex; gap: 8px; flex-shrink: 0; }

.am-btn {
  border: 1px solid var(--wui-border-strong); background: var(--wui-surface); color: var(--wui-cell); border-radius: 7px; padding: 6px 12px;
  font-size: 12.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; font-family: inherit; white-space: nowrap;
}
.am-btn:hover { border-color: #4472c4; }
.am-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.am-btn--accent { border-color: #d97706; color: #d97706; }
.am-btn--accent:hover { background: #fffbeb; }
.am-btn--primary { background: #2e5396; border-color: #2e5396; color: white; }
.am-btn--primary:hover { filter: brightness(1.08); }

.am-status { background: var(--wui-surface); border-radius: 10px; padding: 26px; text-align: center; color: var(--wui-muted); font-size: 13px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); }
.am-status--error { color: #dc2626; }
.am-muted { color: var(--wui-faint); font-size: 12px; }
.am-hint { font-weight: 500; color: var(--wui-faint); font-size: 11.5px; }
.am-hint code { background: var(--wui-bg); padding: 0 4px; border-radius: 3px; }

.am-body { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 14px; align-items: start; }
@media (max-width: 1100px) { .am-body { grid-template-columns: 1fr; } }

/* ── Sidebar area ── */
.am-side { background: var(--wui-surface); border-radius: 10px; padding: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); display: flex; flex-direction: column; gap: 12px; }
.am-plant-head { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; color: var(--wui-muted); margin-bottom: 6px; padding-left: 2px; }
.am-area {
  width: 100%; text-align: left; font-family: inherit; cursor: pointer; margin-bottom: 6px;
  background: var(--wui-surface); border: 1.5px solid var(--wui-border); border-left: 4px solid var(--area-border); border-radius: 8px; padding: 8px 10px;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.am-area:hover { border-color: var(--area-border); }
.am-area--sel { background: var(--area-bg); border-color: var(--area-border); box-shadow: 0 0 0 2px var(--area-pill); }
.am-area--off { opacity: 0.6; }
.am-area--off .am-area-code { text-decoration: line-through; }
.am-area-top { display: flex; align-items: center; gap: 6px; }
.am-area-type { font-size: 10px; font-weight: 800; background: var(--area-pill); color: var(--area-pill-text); padding: 1px 6px; border-radius: 4px; }
.am-area-code { font-weight: 800; font-size: 13.5px; color: var(--wui-text); flex: 1; }
.am-area-meta { display: flex; gap: 10px; font-size: 11px; color: var(--wui-muted); margin-top: 4px; }
.am-area-warn { color: #d97706; font-weight: 600; }
.am-area-zones { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }

.am-zone-chip { font-size: 10px; font-weight: 700; background: var(--area-pill); color: var(--area-pill-text); border: 1px solid var(--area-border); padding: 1px 7px; border-radius: 99px; display: inline-flex; align-items: center; gap: 4px; }
.am-zone-chip--lg { font-size: 12px; padding: 3px 4px 3px 10px; }
.am-zone-x { border: none; background: transparent; color: inherit; cursor: pointer; width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; }
.am-zone-x:hover { background: rgba(0,0,0,0.1); }

/* ── Switch ── */
.am-switch { position: relative; display: inline-flex; cursor: pointer; }
.am-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.am-switch-track { width: 34px; height: 18px; border-radius: 99px; background: var(--wui-border-strong); position: relative; transition: background 0.15s; }
.am-switch-knob { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--wui-surface); transition: left 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
.am-switch input:checked + .am-switch-track { background: #16a34a; }
.am-switch input:checked + .am-switch-track .am-switch-knob { left: 18px; }
.am-switch input:disabled + .am-switch-track { opacity: 0.5; }
.am-switch--sm .am-switch-track { width: 30px; height: 16px; }
.am-switch--sm .am-switch-knob { width: 12px; height: 12px; }
.am-switch--sm input:checked + .am-switch-track .am-switch-knob { left: 16px; }

/* ── Main ── */
.am-main { background: var(--wui-surface); border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); overflow: hidden; min-width: 0; }
.am-main-head { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: var(--area-bg); border-bottom: 1px solid var(--wui-border); flex-wrap: wrap; }
.am-main-title { display: flex; align-items: baseline; gap: 10px; flex: 1; }
.am-main-title h2 { margin: 0; font-size: 20px; font-weight: 800; color: var(--area-text); }
.am-main-type { font-size: 11px; font-weight: 800; color: var(--area-pill-text); background: var(--area-pill); padding: 2px 8px; border-radius: 4px; }
.am-main-status { font-size: 10.5px; font-weight: 800; padding: 2px 8px; border-radius: 4px; }
.am-main-status.on { background: #dcfce7; color: #166534; }
.am-main-status.off { background: #fee2e2; color: #991b1b; }
.am-tabs { display: flex; background: var(--wui-surface); border: 1px solid var(--wui-border-strong); border-radius: 7px; overflow: hidden; }
.am-tabs button { border: none; background: transparent; padding: 6px 12px; font-size: 12.5px; font-weight: 600; color: var(--wui-muted); cursor: pointer; font-family: inherit; display: inline-flex; gap: 5px; align-items: center; }
.am-tabs button.active { background: #2e5396; color: white; }

.am-zones-box { padding: 10px 18px; border-bottom: 1px solid var(--wui-border); background: var(--wui-hover-surface); }
.am-zones-label { font-size: 12px; font-weight: 700; color: var(--wui-cell); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
.am-zones-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.am-select, .am-input { border: 1px solid var(--wui-border-strong); border-radius: 6px; padding: 5px 8px; font-size: 12px; font-family: inherit; background: var(--wui-surface); color: var(--wui-text); }
.am-input--code { width: 130px; text-transform: uppercase; }

/* ── Denah ── */
.am-layout { padding: 12px 18px 16px; }
.am-layout-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.am-layout-bar > :first-child { flex: 1; min-width: 200px; }
.am-edit-hint { color: #92400e; background: #fffbeb; border: 1px solid #fde68a; padding: 5px 10px; border-radius: 6px; }
.am-size { font-size: 12px; color: var(--wui-text-2); display: inline-flex; gap: 4px; align-items: center; }
.am-size input:disabled { background: var(--wui-bg); color: var(--wui-faint); }
.am-auto { display: inline-flex; align-items: center; gap: 3px; margin-right: 6px; cursor: pointer; font-weight: 700; color: var(--wui-muted); user-select: none; }
.am-auto.on { color: #2e5396; }
.am-auto .mdi { font-size: 16px; }
.am-size input { width: 64px; border: 1px solid var(--wui-border-strong); border-radius: 5px; padding: 3px 5px; font-size: 12px; font-family: inherit; }
.am-canvas-wrap { position: relative; overflow: hidden; border: 2px solid var(--am-frame, #1e293b); border-radius: 6px; background: var(--wui-bg); }
.am-canvas-wrap--board {
  height: max(420px, calc(100vh - 330px)); touch-action: none;
  background-color: var(--wui-border); background-image: radial-gradient(var(--wui-border-strong) 1px, transparent 1px); background-size: 16px 16px;
}
.am-canvas-wrap--board .am-canvas { position: absolute; left: 0; top: 0; box-shadow: 0 4px 20px rgba(15,23,42,0.18); }
.am-canvas-wrap--pan, .am-canvas-wrap--pan * { cursor: grab !important; }
.am-layout--full { position: fixed; inset: 0; z-index: 2000; background: var(--wui-surface); padding: 12px 16px; display: flex; flex-direction: column; overflow: auto; }
.am-layout--full .am-canvas-wrap--board { flex: 1; min-height: 300px; height: auto; }
.am-zoom { position: absolute; right: 10px; bottom: 10px; z-index: 10; display: flex; align-items: center; gap: 2px; padding: 3px; background: var(--wui-surface); border: 1px solid var(--wui-border-strong); border-radius: 8px; box-shadow: 0 2px 8px rgba(15,23,42,0.15); }
.am-zoom button { border: none; background: transparent; min-width: 28px; height: 28px; border-radius: 5px; cursor: pointer; color: var(--wui-cell); font-size: 16px; font-family: inherit; display: grid; place-items: center; }
.am-zoom button:hover { background: var(--wui-bg); }
.am-zoom button.on { background: #dbeafe; color: #1d4ed8; }
.am-zoom-pct { font-size: 12px !important; font-weight: 700; min-width: 48px !important; }
.am-zoom-sep { width: 1px; height: 18px; background: var(--wui-border); margin: 0 2px; }
.am-fp-joint { position: absolute; z-index: 2; pointer-events: none; }
.am-fp-guide { position: absolute; z-index: 9; pointer-events: none; background: #ec4899; }
.am-fp-guide--x { top: 0; bottom: 0; width: 1px; }
.am-fp-guide--y { left: 0; right: 0; height: 1px; }
.am-canvas {
  position: relative; transform-origin: top left;
  background-color: var(--wui-hover-surface);
  background-image: linear-gradient(var(--wui-border) 1px, transparent 1px), linear-gradient(90deg, var(--wui-border) 1px, transparent 1px);
  background-size: 50px 50px;
}
.am-canvas--edit { background-color: #fffdf5; cursor: default; }
.am-canvas-empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--wui-faint); font-size: 13px; font-style: italic; pointer-events: none; }
/* Mesin — warna = STATUS (lihat MACHINE_STATUS di useFloorPlan) */
.am-mc {
  position: absolute; box-sizing: border-box; z-index: 3; --mcs: 1;
  background: var(--mc-fill); border: 2px solid var(--mc-border); border-radius: 6px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15); user-select: none; touch-action: none;
}
.am-canvas--edit .am-mc { cursor: grab; }
.am-mc--drag { cursor: grabbing !important; box-shadow: 0 6px 16px rgba(0,0,0,0.25); z-index: 6; }
.am-mc-dot { position: absolute; left: 4px; top: 4px; width: 7px; height: 7px; border-radius: 50%; background: var(--mc-dot); }
.am-mc-code { font-weight: 800; font-size: calc(13px * var(--mcs)); color: var(--mc-text); }
.am-mc-zone { font-size: calc(8px * var(--mcs)); font-weight: 600; color: var(--wui-muted); margin-top: 2px; max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.am-mc-flow { position: absolute; display: flex; gap: 3px; pointer-events: none; z-index: 1; }
.am-mc-flow--bottom { left: 50%; bottom: calc(-9px * var(--mcs)); transform: translateX(-50%); }
.am-mc-flow--top { left: 50%; top: calc(-9px * var(--mcs)); transform: translateX(-50%); }
.am-mc-flow--left { top: 50%; left: calc(-12px * var(--mcs)); transform: translateY(-50%); flex-direction: column; gap: 2px; }
.am-mc-flow--right { top: 50%; right: calc(-12px * var(--mcs)); transform: translateY(-50%); flex-direction: column; gap: 2px; }
.am-mc-flow > span { display: inline-flex; align-items: center; gap: 1px; padding: 0 4px; border-radius: 99px; background: white; border: 1.5px solid; font-size: calc(7.5px * var(--mcs)); font-weight: 800; line-height: calc(13px * var(--mcs)); white-space: nowrap; }
.am-mc-flow .mdi { font-size: calc(9px * var(--mcs)); line-height: 1; }
.am-mc-flow-in { color: #15803d; border-color: #15803d !important; }
.am-mc-flow-out { color: #b91c1c; border-color: #b91c1c !important; }
.am-btn--flow-in { color: #15803d; border-color: #86efac; }
.am-btn--flow-out { color: #b91c1c; border-color: #fca5a5; }
.am-btn--flow-in .mdi, .am-btn--flow-out .mdi { display: inline-block; transition: transform 0.15s; }
.am-mc-parts { position: absolute; right: 3px; top: 2px; font-size: calc(8px * var(--mcs)); color: var(--wui-faint); font-weight: 600; }
.am-mc--off { border-style: dashed; box-shadow: none; }
.am-mc--off .am-mc-code { text-decoration: line-through; }
.am-mc-x { position: absolute; left: -7px; top: -7px; width: 16px; height: 16px; border-radius: 50%; border: none; background: #dc2626; color: white; font-size: 11px; display: grid; place-items: center; cursor: pointer; }
.am-tray { margin-top: 10px; border: 1px dashed var(--wui-border-strong); border-radius: 8px; padding: 8px 10px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; background: var(--wui-hover-surface); }
.am-tray-label { font-size: 11.5px; font-weight: 700; color: var(--wui-muted); margin-right: 6px; }
.am-tray-chip { border: 1.5px solid var(--wui-faint); background: var(--wui-surface); color: var(--wui-cell); border-radius: 6px; padding: 3px 8px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
.am-tray-chip:hover { border-color: #2e5396; color: #2e5396; }

/* Elemen denah */
.am-fp-region { position: absolute; z-index: 1; box-sizing: border-box; border: 1.5px dashed; border-radius: 8px; touch-action: none; }
.am-fp-region-label { position: absolute; left: 8px; top: 5px; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; pointer-events: none; }
.am-fp-road { position: absolute; z-index: 2; box-sizing: border-box; touch-action: none; display: grid; place-items: center; }
.am-fp-road-label { font-size: 10px; font-weight: 800; letter-spacing: 0.05em; background: rgba(255,255,255,0.9); color: #1e293b; padding: 0 6px; border-radius: 3px; white-space: nowrap; }
.am-fp-road--v .am-fp-road-label { transform: rotate(-90deg); }
/* Forklift: aspal + garis tengah kuning putus-putus + tepi kuning */
.am-fp-road--forklift { background-color: #64748b; border: 2px solid #facc15; }
.am-fp-road--forklift.am-fp-road--h { background-image: repeating-linear-gradient(90deg, #facc15 0 14px, transparent 14px 26px); background-size: 100% 2px; background-position: center; background-repeat: no-repeat; }
.am-fp-road--forklift.am-fp-road--v { background-image: repeating-linear-gradient(180deg, #facc15 0 14px, transparent 14px 26px); background-size: 2px 100%; background-position: center; background-repeat: no-repeat; }
/* Pejalan kaki: zebra putih-kuning, tepi kuning */
.am-fp-road--walk { border: 2px solid #15803d; }
.am-fp-road--walk.am-fp-road--h { background: repeating-linear-gradient(90deg, #4ade80 0 8px, #dcfce7 8px 16px); }
.am-fp-road--walk.am-fp-road--v { background: repeating-linear-gradient(180deg, #4ade80 0 8px, #dcfce7 8px 16px); }
/* Conveyor QC: rangka abu + roller melintang */
.am-fp-road--conveyor { border: 2px solid #334155; background-color: #cbd5e1; }
.am-fp-road--conveyor.am-fp-road--h { background-image: repeating-linear-gradient(90deg, #64748b 0 3px, transparent 3px 9px); }
.am-fp-road--conveyor.am-fp-road--v { background-image: repeating-linear-gradient(180deg, #64748b 0 3px, transparent 3px 9px); }
.am-fp-mark {
  position: absolute; z-index: 2; width: 28px; height: 28px; border-radius: 50%; background: var(--wui-surface); border: 1.5px solid currentColor;
  display: grid; place-items: center; font-size: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.15); touch-action: none;
}
.am-fp-mark--flow { width: 64px; gap: 4px !important; border-radius: 14px; border-width: 2px; display: flex; gap: 1px; justify-content: center; font-size: 15px; }
.am-fp-mark--flow b { font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; }
.am-fp-arrow { display: inline-block; transition: transform 0.15s; }
.am-fp-flow-tag { font-size: 9.5px; font-weight: 800; margin-left: 1px; }
.am-fp-mark--sym { width: 36px; height: 36px; border: none; border-radius: 4px; background: transparent; box-shadow: none; filter: drop-shadow(0 1px 1px rgba(15,23,42,0.25)); }
.am-fp-mark--sym .am-fp-mark-label { top: 38px; }
.am-fp-svg { display: inline-flex; line-height: 0; }
.am-fp-mark-label { position: absolute; top: 30px; left: 50%; transform: translateX(-50%); font-size: 9.5px; font-weight: 700; white-space: nowrap; color: var(--wui-cell); background: rgba(255,255,255,0.85); padding: 0 3px; border-radius: 3px; }
.am-canvas--edit .am-fp-region, .am-canvas--edit .am-fp-road, .am-canvas--edit .am-fp-mark { cursor: move; }
.am-fp--sel { outline: 2px solid #2e5396; outline-offset: 2px; }
.am-fp-resize { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; background: var(--wui-surface); border: 1.5px solid #2e5396; border-radius: 2px; z-index: 4; }
.am-fp-resize--nw { left: 0; top: 0; cursor: nwse-resize; }
.am-fp-resize--n  { left: 50%; top: 0; cursor: ns-resize; }
.am-fp-resize--ne { left: 100%; top: 0; cursor: nesw-resize; }
.am-fp-resize--e  { left: 100%; top: 50%; cursor: ew-resize; }
.am-fp-resize--se { left: 100%; top: 100%; cursor: nwse-resize; }
.am-fp-resize--s  { left: 50%; top: 100%; cursor: ns-resize; }
.am-fp-resize--sw { left: 0; top: 100%; cursor: nesw-resize; }
.am-fp-resize--w  { left: 0; top: 50%; cursor: ew-resize; }
.am-fp-compass { position: absolute; right: 14px; top: 14px; z-index: 7; width: 44px; height: 44px; pointer-events: none; }
.am-fp-compass svg { width: 44px; height: 44px; transition: transform 0.2s; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15)); }
.am-fp-marquee { position: absolute; z-index: 8; border: 1.5px dashed #2e5396; background: rgba(46,83,150,0.08); pointer-events: none; }
.am-fp-compass span { position: absolute; right: 50px; top: 50%; transform: translateY(-50%); font-size: 10px; font-weight: 800; color: #dc2626; }

.am-fp-tools, .am-fp-inspect { color: var(--wui-text); display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 8px; padding: 6px 8px; border: 1px solid var(--wui-border); border-radius: 8px; background: var(--wui-hover-surface); }
.am-fp-inspect { background: #eef2ff; border-color: #c7d2fe; min-height: 44px; box-sizing: border-box; }
.am-fp-inspect--idle { background: var(--wui-hover-surface); border-color: var(--wui-border); }
.am-kbd-help { position: relative; display: inline-flex; align-items: center; gap: 3px; margin-left: 8px; font-weight: 700; cursor: help; outline: none; }
.am-kbd-pop { display: none; position: absolute; top: calc(100% + 6px); left: 0; z-index: 20; flex-direction: column; gap: 5px; min-width: 250px; padding: 10px 12px; background: var(--wui-surface); color: var(--wui-cell); border: 1px solid var(--wui-border); border-radius: 8px; box-shadow: 0 8px 24px rgba(15,23,42,0.15); font-weight: 500; white-space: nowrap; }
.am-kbd-help:hover .am-kbd-pop, .am-kbd-help:focus .am-kbd-pop { display: flex; }
.am-fp-inspect > .mdi { font-size: 18px; color: var(--wui-cell); }
.am-fp-tools-label { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; color: var(--wui-muted); text-transform: uppercase; margin-right: 2px; }
.am-fp-tool { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--wui-border-strong); background: var(--wui-surface); color: var(--wui-cell); border-radius: 6px; padding: 4px 8px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
.am-fp-tool:hover:not(:disabled) { border-color: #2e5396; }
.am-fp-tool:disabled { opacity: 0.4; cursor: default; }
.am-seg { display: inline-flex; border: 1px solid var(--wui-border-strong); border-radius: 6px; overflow: hidden; }
.am-seg button { border: none; background: var(--wui-surface); padding: 4px 9px; font-size: 12px; font-weight: 700; color: var(--wui-text-2); cursor: pointer; font-family: inherit; }
.am-seg button + button { border-left: 1px solid var(--wui-border); }
.am-seg button.on { background: #2e5396; color: white; }
.am-fp-tool--icon { padding: 4px 6px; font-size: 15px; }
.am-fp-sep { width: 1px; height: 20px; background: var(--wui-border-strong); margin: 0 2px; }
.am-fp-swatch { display: inline-block; width: 26px; height: 10px; border-radius: 2px; box-sizing: border-box; border-width: 1.5px !important; }
.am-fp-tones { display: inline-flex; gap: 4px; }
.am-fp-tone { width: 20px; height: 20px; border-radius: 5px; border: 2px solid; cursor: pointer; padding: 0; }
.am-fp-tone.on { box-shadow: 0 0 0 2px white, 0 0 0 4px #2e5396; }
.am-btn--danger { color: #dc2626; border-color: #fecaca; }
.am-btn--danger:hover { background: #fef2f2; border-color: #dc2626; }
kbd { font-family: inherit; font-size: 10.5px; border: 1px solid #fcd34d; border-bottom-width: 2px; border-radius: 3px; padding: 0 4px; background: var(--wui-surface); }

/* Legenda */
.am-legend { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 10px; padding: 8px 12px; border: 1px solid var(--wui-border); border-radius: 8px; background: var(--wui-surface); }
.am-legend-grp { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
.am-legend-title { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--wui-faint); }
.am-legend-item { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--wui-cell); }
.am-legend-item b { font-weight: 700; color: var(--wui-muted); }
.am-legend-item .mdi { font-size: 15px; }
.am-legend-sw { width: 12px; height: 12px; border-radius: 3px; }
.am-legend-sw--region { border: 1.5px dashed; box-sizing: border-box; }
.am-legend-mc { position: relative; width: 22px; height: 14px; border: 2px solid; border-radius: 3px; box-sizing: border-box; }
.am-legend-mc span { position: absolute; left: 2px; top: 2px; width: 5px; height: 5px; border-radius: 50%; }
.am-type-legend { display: flex; flex-wrap: wrap; gap: 4px 10px; padding: 8px 4px 0; border-top: 1px solid var(--wui-bg); font-size: 11px; font-weight: 700; color: var(--wui-cell); }
.am-type-legend span { display: inline-flex; align-items: center; gap: 4px; }
.am-type-legend i { width: 10px; height: 10px; border-radius: 3px; }
.am-type-legend small { font-weight: 500; color: var(--wui-faint); }

/* ── Daftar ── */
.am-list { padding: 12px 18px 16px; }
.am-add { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.am-add .am-input { flex: 1; min-width: 160px; }
.am-zone-block { margin-bottom: 14px; border: 1px solid var(--wui-border); border-radius: 8px; overflow-x: auto; }
.am-zone-head { display: flex; align-items: center; gap: 10px; padding: 7px 10px; background: var(--area-bg); border-bottom: 1px solid var(--wui-border); }
.am-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.am-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--wui-muted); padding: 6px 10px; background: var(--wui-hover-surface); border-bottom: 1px solid var(--wui-border); }
.am-table td { padding: 6px 10px; border-bottom: 1px solid var(--wui-bg); color: var(--wui-text); }
.am-table td.mono { white-space: nowrap; }
.am-table tr:last-child td { border-bottom: none; }
.am-table .r, .am-table th.r { text-align: right; }
.am-table .c, .am-table th.c { text-align: center; }
.am-table .mono { font-family: ui-monospace, Consolas, monospace; }
.am-row--off td { color: var(--wui-faint); }
.am-row--off td strong { text-decoration: line-through; }
.am-jigs { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.am-jig-chip { display: inline-flex; align-items: baseline; gap: 3px; padding: 2px 8px; border: 1.5px solid #99f6e4; border-radius: 7px; background: #f0fdfa; color: #134e4a; cursor: pointer; font-family: inherit; }
.am-jig-chip strong { font-size: 13px; }
.am-jig-chip small { font-size: 10px; color: var(--wui-muted); }
.am-jig-chip:hover { border-color: #14b8a6; }
.am-jig-add { display: inline-flex; align-items: center; gap: 1px; padding: 2px 7px; border: 1.5px dashed #5eead4; border-radius: 7px; background: var(--wui-surface); color: #0f766e; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
.am-jig-add:hover:not(:disabled) { background: #f0fdfa; }
.am-jig-edit { display: inline-flex; align-items: center; gap: 2px; }
.am-input--jig { width: 56px; padding: 3px 6px; }
.am-icon-btn { border: 1px solid var(--wui-border-strong); background: var(--wui-surface); border-radius: 6px; width: 26px; height: 26px; display: inline-grid; place-items: center; cursor: pointer; color: var(--wui-cell); }
.am-icon-btn:disabled { opacity: .45; cursor: not-allowed; }
.am-icon-btn--danger { color: #dc2626; }

/* ── Status mesin (sama dgn MACHINE_STATUS di useFloorPlan) ── */
.am-st--run  { --mc-fill: #f0fdf4; --mc-border: #16a34a; --mc-text: #14532d; --mc-dot: #16a34a; }
.am-st--idle { --mc-fill: #ffffff; --mc-border: #94a3b8; --mc-text: #334155; --mc-dot: #f59e0b; }
.am-st--off  { --mc-fill: #f1f5f9; --mc-border: #cbd5e1; --mc-text: #94a3b8; --mc-dot: #dc2626; }
.am-legend-mc { background: var(--mc-fill); border-color: var(--mc-border); }
.am-legend-mc.am-st--off { border-style: dashed; }
.am-legend-mc span { background: var(--mc-dot); }

/* ── Mode gelap ── */
:root.dark .am-st--run  { --mc-fill: rgba(22, 163, 74, .16); --mc-border: #22c55e; --mc-text: #bbf7d0; }
:root.dark .am-st--idle { --mc-fill: #1e293b; --mc-border: #64748b; --mc-text: #e2e8f0; }
:root.dark .am-st--off  { --mc-fill: #0f172a; --mc-border: #475569; --mc-text: #64748b; }
:root.dark .am-page { --am-frame: #475569; }
:root.dark .am-canvas { background-color: #111a2e; background-image: linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px); }
:root.dark .am-canvas--edit { background-color: #131c30; }
:root.dark .am-canvas-wrap--board { background-color: #0b1220; background-image: radial-gradient(#1e293b 1px, transparent 1px); }
:root.dark .am-area--sel,
:root.dark .am-main-head,
:root.dark .am-zone-head { background: color-mix(in srgb, var(--area-border) 16%, var(--wui-surface)); }
:root.dark .am-area-type, :root.dark .am-main-type, :root.dark .am-zone-chip { background: color-mix(in srgb, var(--area-border) 28%, transparent); color: #e2e8f0; }
:root.dark .am-main-title h2 { color: color-mix(in srgb, var(--area-border) 55%, white); }
:root.dark .am-main-status.on { background: rgba(22, 163, 74, .2); color: #86efac; }
:root.dark .am-main-status.off { background: rgba(220, 38, 38, .2); color: #fca5a5; }
:root.dark .am-edit-hint { background: rgba(245, 158, 11, .12); border-color: rgba(245, 158, 11, .35); color: #fcd34d; }
:root.dark kbd { background: var(--wui-surface); border-color: rgba(245, 158, 11, .45); color: var(--wui-text); }
:root.dark .am-fp-inspect:not(.am-fp-inspect--idle) { background: rgba(59, 130, 246, .12); border-color: rgba(59, 130, 246, .35); }
:root.dark .am-fp-region-label { filter: brightness(2.2) saturate(.7); }
:root.dark .am-fp-mark-label { background: rgba(15, 23, 42, .85); color: #e2e8f0; }
:root.dark .am-fp-mark:not(.am-fp-mark--sym) { background: var(--wui-surface); }
:root.dark .am-mc-flow > span { background: var(--wui-surface); }
:root.dark .am-mc-flow-in { color: #86efac; border-color: #22c55e !important; }
:root.dark .am-mc-flow-out { color: #fca5a5; border-color: #ef4444 !important; }
:root.dark .am-btn--accent { color: #fbbf24; border-color: #b45309; }
:root.dark .am-btn--accent:hover { background: rgba(245, 158, 11, .12); }
:root.dark .am-btn--danger { color: #fca5a5; border-color: rgba(239, 68, 68, .45); }
:root.dark .am-btn--danger:hover { background: rgba(239, 68, 68, .12); }
:root.dark .am-seg button.on, :root.dark .am-tabs button.active { background: #2563eb; }
:root.dark .am-zoom button.on { background: rgba(59, 130, 246, .2); color: #93c5fd; }
:root.dark .am-jig-chip { background: rgba(20, 184, 166, .12); color: #99f6e4; border-color: rgba(20, 184, 166, .4); }
:root.dark .am-jig-add { background: transparent; color: #5eead4; }
:root.dark .am-status--error { color: #fca5a5; }
</style>
