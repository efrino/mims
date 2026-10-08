import type { Detail, RouteOp } from '@/types/Welding/Transaction/Achievement_v2';

// Saklar OP Achievement v2 (sama dgn LKH utils/lkhGroups.splitByOp):
// mode Pisah = proses antara (OP10, OP20, ...) tampil sbg baris read-only di atas baris part;
// baris part sendiri = OP terakhir (hasil jadi) → actual & edit tetap di sana.

/** Proses antara (semua kecuali OP terakhir). Kosong bila rute < 2 proses. */
export const midOps = (item: Detail): RouteOp[] => {
  const ops = item.ops ?? [];
  return ops.length < 2 ? [] : ops.slice(0, -1);
};

/** OP terakhir part (null bila rute < 2 proses). */
export const lastOp = (item: Detail): RouteOp | null => {
  const ops = item.ops ?? [];
  return ops.length < 2 ? null : ops[ops.length - 1];
};
