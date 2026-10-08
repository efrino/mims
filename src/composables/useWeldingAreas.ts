// composables/useWeldingAreas.ts
// Sumber tunggal daftar area welding untuk UI (Achievement V2, LKH, Mutasi Bulanan,
// Master Data, Planning): dibaca dari master Area & Mesin (ms_welding_area, area aktif).
// Sejak migrasi 2026-09-24 semua data memakai KODE AREA ini langsung (zone lama
// ROBOT BARAT/TIMUR/CO/HMMI & SA MANUAL sudah dilebur) → zones = [area_code].
// Cache 1x per sesi; fallback daftar statis kalau API gagal.
import { computed, ref } from 'vue'
import weldingAreaService, { type AreaType, type AreaPlant } from '@/services/Public/Welding/weldingAreaService'

export interface WeldingAreaGroup {
  area_code: string
  area_type: AreaType
  plant: AreaPlant
  sort_order: number
  zones: string[]
}

export const AREA_TYPE_LABEL: Record<AreaType, string> = { WSS: 'WSS', CO: 'CO2 ROBOT', SA: 'SUB ASSY' }

// Fallback = mapping seed master (selaras area_master_migration.sql).
const FALLBACK: WeldingAreaGroup[] = [
  { area_code: 'WSS ADM', area_type: 'WSS', plant: 'ADM', sort_order: 1, zones: ['WSS ADM'] },
  { area_code: 'WSS MMKI', area_type: 'WSS', plant: 'MMKI', sort_order: 2, zones: ['WSS MMKI'] },
  { area_code: 'WSS HMMI', area_type: 'WSS', plant: 'HMMI', sort_order: 3, zones: ['WSS HMMI'] },
  { area_code: 'CO ADM', area_type: 'CO', plant: 'ADM', sort_order: 4, zones: ['CO ADM'] },
  { area_code: 'CO MMKI', area_type: 'CO', plant: 'MMKI', sort_order: 5, zones: ['CO MMKI'] },
  { area_code: 'SA ADM', area_type: 'SA', plant: 'ADM', sort_order: 7, zones: ['SA ADM'] },
  { area_code: 'SA HMMI', area_type: 'SA', plant: 'HMMI', sort_order: 9, zones: ['SA HMMI'] },
]

const groups = ref<WeldingAreaGroup[]>(FALLBACK)
const loaded = ref(false)
let pending: Promise<void> | null = null

async function load(force = false): Promise<void> {
  if (loaded.value && !force) return
  if (pending && !force) return pending
  pending = (async () => {
    try {
      const list = await weldingAreaService.list(true)
      const g = list
        .filter(a => a.zones.length)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(a => ({
          area_code: a.area_code,
          area_type: a.area_type,
          plant: a.plant,
          sort_order: a.sort_order,
          zones: [...a.zones].sort((x, y) => x.sort_order - y.sort_order).map(z => z.zone),
        }))
      if (g.length) groups.value = g
      loaded.value = true
    } catch { /* pakai FALLBACK */ } finally { pending = null }
  })()
  return pending
}

/** Semua zone aktif, urut sesuai master (area lalu zone). */
const zones = computed<string[]>(() => groups.value.flatMap(g => g.zones))

export const PLANT_ORDER: AreaPlant[] = ['ADM', 'MMKI', 'HMMI']

/** Area master dikelompokkan per plant (urutan ADM, MMKI, HMMI) — utk dropdown pilih area. */
const byPlant = computed<{ plant: AreaPlant; areas: WeldingAreaGroup[] }[]>(() =>
  PLANT_ORDER
    .map(plant => ({ plant, areas: groups.value.filter(g => g.plant === plant) }))
    .filter(p => p.areas.length),
)

/** Cari grup area master by area_code (case-insensitive). */
const areaByCode = (code: string): WeldingAreaGroup | null =>
  groups.value.find(g => g.area_code.toUpperCase() === (code || '').trim().toUpperCase()) ?? null

/** Zone-zone di balik 1 kode (area master → zones; zone langsung → [zone]). */
const zonesOf = (code: string): string[] => areaByCode(code)?.zones ?? [(code || '').trim()]

/** zone (area lama) → grup area master. */
const zoneIndex = computed(() => {
  const m = new Map<string, WeldingAreaGroup>()
  groups.value.forEach(g => g.zones.forEach(z => m.set(z.toUpperCase(), g)))
  return m
})

const areaOfZone = (zone: string): WeldingAreaGroup | null => zoneIndex.value.get((zone || '').trim().toUpperCase()) ?? null

/** Posisi zone untuk sorting; zone di luar master ditaruh paling akhir. */
const zoneOrder = (zone: string): number => {
  const i = zones.value.findIndex(z => z.toUpperCase() === (zone || '').trim().toUpperCase())
  return i === -1 ? Number.MAX_SAFE_INTEGER : i
}

// ── Mode ROBOT (1 part = 1 mesin + 1 jig) ────────────────────────────────
// Dulu ditentukan dari zone (ROBOT CO/HMMI/BARAT/TIMUR). Setelah zone dilebur:
//  - CO * & SA HMMI  : seluruh area robot (eks ROBOT CO / ROBOT HMMI).
//  - SA ADM          : campuran — robot hanya mesin RSW*/RB-* (eks ROBOT BARAT/
//                      TIMUR); mesin manual (ST*, T*, GUN, ...) eks SA MANUAL.
export const ROBOT_AREAS = ['CO ADM', 'CO MMKI', 'CO HMMI', 'SA HMMI']
export const MIXED_ROBOT_AREAS = ['SA ADM']
export const isRobotMachineCode = (machine: string | null | undefined): boolean =>
  /^(RSW|RB-?)\d/i.test((machine || '').trim())
export function isRobotSetup(area: string | null | undefined, machine?: string | null): boolean {
  const a = (area || '').trim().toUpperCase()
  if (ROBOT_AREAS.includes(a)) return true
  if (MIXED_ROBOT_AREAS.includes(a)) return isRobotMachineCode(machine)
  return false
}

export function useWeldingAreas() {
  return { groups, zones, byPlant, loaded, load, areaOfZone, areaByCode, zonesOf, zoneOrder }
}
