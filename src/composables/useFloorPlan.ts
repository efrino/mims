// composables/useFloorPlan.ts
// Elemen denah 2D area welding selain mesin: wilayah, jalan/lorong, titik khusus, kompas.
// Disimpan utuh di ms_welding_area.layout_json. Semua warna di sini = STANDAR denah;
// jangan tambah warna lokal di komponen.

export interface FpRect { id: string; x: number; y: number; w: number; h: number }
export interface FpRegion extends FpRect { label: string; tone: RegionTone }
export interface FpRoad extends FpRect { kind: RoadKind; label?: string }
/** dir: arah panah IN/OUT dalam derajat (0 = ke kanan). */
export interface FpMark { id: string; x: number; y: number; kind: MarkKind; label?: string; dir?: 0 | 90 | 180 | 270 }
/** auto = ukuran kanvas mengikuti isi denah (default). */
/** IN/OUT pallet per mesin: arah panah (derajat, 0 = kanan). Kunci = id mesin. */
export type Dir = 0 | 90 | 180 | 270
/** side: sisi mesin tempat badge IN/OUT; 'auto' = sisi terdekat ke jalur pallet (arah panah ikut otomatis). */
export type FlowSide = 'auto' | 'top' | 'bottom' | 'left' | 'right'
export interface McFlow { in?: Dir; out?: Dir; side?: FlowSide }
/** Arah panah default per sisi: IN menunjuk ke mesin, OUT menjauh dari mesin. */
export const FLOW_DIRS: Record<Exclude<FlowSide, 'auto'>, { in: Dir; out: Dir }> = {
  top: { in: 90, out: 270 }, bottom: { in: 270, out: 90 }, left: { in: 0, out: 180 }, right: { in: 180, out: 0 },
}
export interface FloorPlan { version: 1; north: 0 | 90 | 180 | 270; auto: boolean; mcScale?: number; mcFlow: Record<string, McFlow>; regions: FpRegion[]; roads: FpRoad[]; marks: FpMark[] }

// ── Status mesin (satu-satunya pembeda warna kotak mesin) ──
export type MachineStatus = 'run' | 'idle' | 'off'
export const MACHINE_STATUS: Record<MachineStatus, { label: string; hint: string; fill: string; border: string; text: string; dot: string }> = {
  run:  { label: 'Aktif',            hint: 'aktif & punya part',  fill: '#f0fdf4', border: '#16a34a', text: '#14532d', dot: '#16a34a' },
  idle: { label: 'Aktif, tanpa part', hint: 'aktif, 0 part',       fill: '#ffffff', border: '#94a3b8', text: '#334155', dot: '#f59e0b' },
  off:  { label: 'Nonaktif',         hint: 'mesin dimatikan',     fill: '#f1f5f9', border: '#cbd5e1', text: '#94a3b8', dot: '#dc2626' },
}
export const machineStatus = (m: { is_active: number; part_count: number }): MachineStatus =>
  !m.is_active ? 'off' : m.part_count > 0 ? 'run' : 'idle'

// ── Wilayah: tint netral, tidak bentrok dengan warna area / status ──
export type RegionTone = 'wip' | 'slate' | 'sky' | 'teal' | 'indigo' | 'rose' | 'stone'
export const REGION_TONES: Record<RegionTone, { fill: string; border: string; text: string }> = {
  wip:    { fill: 'repeating-linear-gradient(45deg, rgba(234,179,8,0.16) 0 10px, rgba(234,179,8,0.05) 10px 20px)', border: '#ca8a04', text: '#854d0e' },
  slate:  { fill: 'rgba(100,116,139,0.10)', border: '#64748b', text: '#334155' },
  sky:    { fill: 'rgba(14,165,233,0.10)',  border: '#0284c7', text: '#075985' },
  teal:   { fill: 'rgba(20,184,166,0.10)',  border: '#0d9488', text: '#115e59' },
  indigo: { fill: 'rgba(99,102,241,0.10)',  border: '#4f46e5', text: '#3730a3' },
  rose:   { fill: 'rgba(244,63,94,0.08)',   border: '#e11d48', text: '#9f1239' },
  stone:  { fill: 'rgba(168,162,158,0.14)', border: '#78716c', text: '#44403c' },
}

// ── Jalan / lorong (mengikuti marka lantai pabrik umum) ──
export type RoadKind = 'forklift' | 'walk' | 'conveyor'
export const ROAD_KINDS: Record<RoadKind, { label: string; icon: string }> = {
  // key 'forklift' dipertahankan demi data tersimpan; tampil sebagai jalur pallet.
  forklift: { label: 'Jalur pallet',     icon: 'mdi-dolly' },
  walk:     { label: 'Jalur pejalan kaki', icon: 'mdi-walk' },
  conveyor: { label: 'Conveyor QC (AI Kamera)', icon: 'mdi-cctv' },
}

// ── Titik khusus ──
export type MarkKind = 'in' | 'out' | 'door' | 'pillar' | 'qc' | 'apar' | 'panel' | 'office' | 'assembly'
export const MARK_KINDS: Record<MarkKind, { label: string; icon: string; color: string; flow?: 'IN' | 'OUT' }> = {
  in:       { label: 'IN (pallet masuk)',   icon: 'mdi-package-variant-closed', color: '#15803d', flow: 'IN' },
  out:      { label: 'OUT (pallet keluar)', icon: 'mdi-package-variant-closed', color: '#b91c1c', flow: 'OUT' },
  door:     { label: 'Pintu',          icon: 'mdi-door-open',            color: '#475569' },
  pillar:   { label: 'Pilar',          icon: 'mdi-square',               color: '#334155' },
  qc:       { label: 'QC · AI Kamera', icon: 'mdi-cctv',                 color: '#0f766e' },
  apar:     { label: 'APAR',           icon: 'mdi-fire-extinguisher',    color: '#dc2626' },
  panel:    { label: 'Panel listrik',  icon: 'mdi-flash',                color: '#ca8a04' },
  office:   { label: 'Kantor / leader', icon: 'mdi-desk',                color: '#4338ca' },
  assembly: { label: 'Titik kumpul',   icon: 'mdi-account-group',        color: '#15803d' },
}

export const emptyFloorPlan = (): FloorPlan => ({ version: 1, north: 0, auto: true, mcFlow: {}, regions: [], roads: [], marks: [] })

export function parseFloorPlan(raw: unknown): FloorPlan {
  let v: any = raw
  if (typeof raw === 'string') { try { v = JSON.parse(raw) } catch { v = null } }
  if (!v || typeof v !== 'object') return emptyFloorPlan()
  const arr = (x: unknown) => (Array.isArray(x) ? x : [])
  return {
    version: 1,
    north: [0, 90, 180, 270].includes(v.north) ? v.north : 0,
    auto: v.auto !== false,
    mcScale: [1, 1.3, 1.6].includes(v.mcScale) ? v.mcScale : 1,
    mcFlow: v.mcFlow && typeof v.mcFlow === 'object' ? v.mcFlow : {},
    regions: arr(v.regions).filter((r: any) => r.tone in REGION_TONES),
    roads: arr(v.roads).filter((r: any) => r.kind in ROAD_KINDS),
    marks: arr(v.marks).filter((m: any) => m.kind in MARK_KINDS),
  }
}

export const fpId = () => Math.random().toString(36).slice(2, 9)

/** Ukuran kotak titik di kanvas: IN/OUT berupa pil (orang + panah + teks), lainnya lingkaran 28px. */
export const markSize = (kind: MarkKind) => (MARK_KINDS[kind]?.flow ? { w: 64, h: 28 } : { w: 36, h: 36 })

/**
 * Simbol denah (tampak atas / rambu) per titik — SVG viewBox 0 0 32 32, konstanta statis (aman untuk v-html).
 * Dipakai sama di kanvas, toolbar, inspector, dan legenda.
 */
export const MARK_SVG: Partial<Record<MarkKind, string>> = {
  // Pintu (tampak atas): dinding kiri-kanan, daun pintu di engsel kiri, area ayun seperempat lingkaran
  door: '<path d="M7 27 V7 A20 20 0 0 1 27 27 Z" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5" stroke-linejoin="round"/>'
    + '<rect x="0" y="25" width="7" height="5" fill="#334155"/><rect x="27" y="25" width="5" height="5" fill="#334155"/>'
    + '<rect x="5.5" y="7" width="3.2" height="20" rx="1" fill="#92400e"/>',
  // Pilar beton: kotak + silang (simbol kolom struktur)
  pillar: '<rect x="4" y="4" width="24" height="24" fill="#cbd5e1" stroke="#334155" stroke-width="2.5"/><path d="M4 4 L28 28 M28 4 L4 28" stroke="#334155" stroke-width="2"/>',
  // Kamera AI: badan kamera + lensa + dudukan dinding + kerucut pandang
  qc: '<path d="M19 15 L31 7 L31 25 Z" fill="#14b8a6" opacity=".25"/>'
    + '<rect x="2" y="9" width="18" height="11" rx="2.5" fill="#0f766e"/><circle cx="17" cy="14.5" r="2.6" fill="#99f6e4" stroke="#134e4a" stroke-width="1"/>'
    + '<rect x="7" y="20" width="4" height="6" fill="#475569"/><rect x="3" y="26" width="12" height="3.5" rx="1.2" fill="#334155"/>',
  // APAR: tabung merah + label + kepala + selang
  apar: '<rect x="9" y="9" width="13" height="21" rx="5" fill="#dc2626"/><rect x="9" y="16" width="13" height="5" fill="#fecaca"/>'
    + '<rect x="12" y="4" width="7" height="6" rx="1.2" fill="#1f2937"/><path d="M19 6 H26 V15" fill="none" stroke="#1f2937" stroke-width="2.4" stroke-linecap="round"/>',
  // Panel listrik: lemari abu + simbol petir kuning
  panel: '<rect x="4" y="2" width="24" height="28" rx="2.5" fill="#e5e7eb" stroke="#475569" stroke-width="2.2"/>'
    + '<path d="M18.5 5 L9.5 17.5 H15.5 L13 27 L23 13.5 H17 Z" fill="#facc15" stroke="#a16207" stroke-width="1.1" stroke-linejoin="round"/>',
  // Meja leader (tampak atas): meja + laptop + kursi
  office: '<rect x="2" y="3" width="28" height="13" rx="2" fill="#c7d2fe" stroke="#4338ca" stroke-width="2"/>'
    + '<rect x="10" y="5.5" width="12" height="7" rx="1" fill="#312e81"/><rect x="11.5" y="7" width="9" height="4" fill="#818cf8"/>'
    + '<rect x="9" y="19" width="14" height="9" rx="4" fill="#4f46e5"/><rect x="8" y="26" width="16" height="4" rx="2" fill="#312e81"/>',
  // Titik kumpul: rambu hijau (ISO 7010 E007) — 3 orang
  assembly: '<rect x="1" y="1" width="30" height="30" rx="3.5" fill="#16a34a"/>'
    + '<circle cx="16" cy="10" r="3" fill="#fff"/><circle cx="8.5" cy="12.5" r="2.6" fill="#fff"/><circle cx="23.5" cy="12.5" r="2.6" fill="#fff"/>'
    + '<path d="M11.5 26 V18.5 A4.5 4.5 0 0 1 20.5 18.5 V26 Z M4.5 26 V20 A4 4 0 0 1 11 17.5 V26 Z M21 26 V17.5 A4 4 0 0 1 27.5 20 V26 Z" fill="#fff"/>',
}
export const markSvg = (kind: MarkKind, size = 32) => `<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">${MARK_SVG[kind] ?? ''}</svg>`
