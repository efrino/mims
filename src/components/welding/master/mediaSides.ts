// Enam sisi foto (part & pallet) — dipakai grid upload (MediaSideGrid), kubus 2.5D,
// dan penampil foto pallet. rx/ry = rotasi kubus agar sisi itu menghadap kamera.
import type { MediaViewSide, MsWeldingMedia } from '@/types/Public/Welding/master';

export const CUBE_SIDES: { key: MediaViewSide; label: string; icon: string; rx: number; ry: number }[] = [
  { key: 'front',  label: 'Depan',    icon: 'mdi-arrow-collapse-down',     rx: 0,   ry: 0 },
  { key: 'back',   label: 'Belakang', icon: 'mdi-arrow-collapse-up',       rx: 0,   ry: 180 },
  { key: 'left',   label: 'Kiri',     icon: 'mdi-arrow-collapse-left',     rx: 0,   ry: 90 },
  { key: 'right',  label: 'Kanan',    icon: 'mdi-arrow-collapse-right',    rx: 0,   ry: -90 },
  { key: 'top',    label: 'Atas',     icon: 'mdi-arrow-up-bold-outline',   rx: -90, ry: 0 },
  { key: 'bottom', label: 'Bawah',    icon: 'mdi-arrow-down-bold-outline', rx: 90,  ry: 0 },
];

/** Peta sisi → foto (hanya gambar yg ditandai view_side). */
export function sideMap(items: MsWeldingMedia[]) {
  const map: Partial<Record<MediaViewSide, MsWeldingMedia>> = {};
  for (const m of items) if (m.view_side && m.media_type === 'image') map[m.view_side] = m;
  return map;
}
