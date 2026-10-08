// Tipe untuk GLC Sub Assy Robot Spot.
// Backend: majsf_rest_api/api/glc  (tabel glc, glc_part, glc_machine, glc_pattern)

export interface GlcParam {
  working_day: number
  efisiensi: number
  faktor_ct: number
  tip_dress_sec: number
  tip_change_sec: number
  stroke_per_dress: number
  dress_per_change: number
  toleransi_blok: number
  batas_mp: number
  jam_day_normal: number
  jam_day_pjk: number
  jam_night_normal: number
  jam_night_pjk: number
  wt_1shift: number
  wt_1shift_pjk: number
  wt_2shift: number
  wt_2shift_pjk1s: number
  wt_2shift_pjk2s: number
  dandori_menit: number
  /** per job di penyusun pattern, bukan alokasi harian */
  downtime_menit: number
  /** alokasi downtime tiap robot per hari, dalam menit; masuk ke TPT */
  downtime_harian_menit: number
  dasar_pcs_hari: 'PABRIK' | 'CUSTOMER'
  pakai_tandem: 0 | 1
  pakai_stock_ifpd: 0 | 1
  hari_cover_stock: number
}

export interface GlcPeriode extends Partial<GlcParam> {
  id: number
  area_code: string
  periode: string
  periode_type: 'BULANAN' | 'W1' | 'W2' | 'W3' | 'W4' | 'W5'
  periode_start: string | null
  periode_end: string | null
  status: 'DRAFT' | 'ACTIVE' | 'FROZEN'
  is_frozen: 0 | 1
  frozen_at: string | null
  frozen_by: string | null
  frozen_note: string | null
  total_tpt: number
  max_tpt: number
  total_mp: number
  jam_terpasang: number
  jam_pjk: number
  robot_over_blok: number
  robot_over_max: number
  part_total: number
  part_ada_order: number
  part_tanpa_ct: number
  part_tanpa_spot: number
  part_tanpa_kanban: number
  part_tanpa_mdfo: number
  note: string | null
}

export interface GlcMachine {
  machine: string
  gun_type: string | null
  teiryo_jam: number
  downtime_jam: number
  tip_change_jam: number
  teiki_jam: number
  tpt_jam: number
  blok_shift: number
  sisa_jam: number
  mp_day: number
  pcs_day: number
  stroke_day: number
  item_count: number
  spot_total: number
  uph: number
  is_over_blok: 0 | 1
  is_over_max: 0 | 1
}

export interface GlcPart {
  machine: string
  part_number: string
  part_name: string | null
  model: string | null
  customer: string | null
  customer_wd: number | null
  op: string | null
  urutan_op: number
  status_wip: string | null
  job_no: string | null
  jig: string | null
  jig_first: string | null
  qty_kanban: number
  spot: number
  cycle_time_sec: number | null
  order_periode: number
  stock_ifpd: number
  stock_cover_pcs: number
  net_order: number
  pcs_day: number
  lot_size: number
  teiki_jam: number
  stroke_day: number
  uph: number
}

export interface GlcPattern {
  machine: string
  pattern: 'A' | 'B' | 'C' | 'D'
  shift: 'DAY' | 'NIGHT'
  hari_ke: number
  urutan: number
  part_number: string
  op: string | null
  status_wip: string | null
  jig: string | null
  tandem_group: number | null
  tandem_role: 'LEAD' | 'FOLLOW' | null
  tandem_pair_jig: string | null
  jig_adjacent: 0 | 1
  loading_menit: number
  weld_menit: number
  idle_menit: number
  ct_efektif_detik: number
  uph_efektif: number
  lot_size: number
  qty_kanban: number
  jumlah_kanban: number
  stroke: number
  tpt_menit: number
}

export interface GlcTandem {
  machine: string
  pattern: string
  job: number
  weld_menit: number
  loading_menit: number
  idle_menit: number
  hemat_menit: number
  tpt_menit: number
  jig_bersebelahan: number
}

export interface GlcDataKurang {
  machine: string | null
  part_number: string
  part_name: string | null
  op: string | null
  model: string | null
  pcs_day: number
  cycle_time_sec: number | null
  spot: number
  qty_kanban: number
  masalah: string
}

/* ------------------------------------------------------------------ *
 *  BALANCING & ROUND UP
 * ------------------------------------------------------------------ */

/** Satu baris rencana perpindahan part antar robot. */
export interface GlcPindah {
  part_no: string
  op: string | null
  dari: string
  ke: string
  /** beban yang ikut berpindah, dalam jam */
  beban: number
  spot: number
  pcs: number
}

/** Keadaan satu robot sebelum dan sesudah rencana. */
export interface GlcBalanceRobot {
  machine: string
  gun: string | null
  tpt_before: number
  tpt_after: number
  blok_before: number
  blok_after: number
  mp_before: number
  mp_after: number
  item_before: number
  item_after: number
}

export interface GlcBalanceRingkas {
  tpt_before: number
  tpt_after: number
  /** selisih total beban; harus 0 karena perpindahan tidak membuat beban baru */
  selisih_tpt: number
  seimbang: boolean
  mp_before: number
  mp_after: number
  blok_before: number
  blok_after: number
  jumlah_pindah: number
}

/**
 * Penyesuaian jam pada round up. Round up TIDAK memindahkan part: ia hanya
 * merapikan jam tiap robot ke blok jam kerja, memangkas yang kelebihan dan
 * memberikannya ke yang belum penuh.
 */
export interface GlcAdjust {
  machine: string
  gun: string | null
  jam_sebelum: number
  jam_sesudah: number
  /** negatif = dipangkas, positif = ditambah; seluruh kolom berjumlah nol */
  selisih: number
  arah: 'DIPANGKAS' | 'DITAMBAH'
}

export interface GlcBalance {
  ok: boolean
  mode: 'BALANCING' | 'ROUNDUP'
  robot: GlcBalanceRobot[]
  /** hanya terisi pada mode BALANCING */
  pindah: GlcPindah[]
  /** hanya terisi pada mode ROUNDUP */
  adjust: GlcAdjust[]
  ringkas: GlcBalanceRingkas
}

/** Satu batang di grafik GLC: sudah berupa angka jadi, bukan data mentah. */
export interface BarisGrafik {
  machine: string
  gun?: string | null
  teiki: number
  teiryo: number
  tip: number
  dt: number
  tpt: number
  blok: number
  mp: number
  uph: number
  item: number
  pcs: number
  stroke: number
  spot: number
}

/* ================================================================
 *  JADWAL MINGGUAN + RECOVERY AKHIR PEKAN
 * ================================================================ */

/** Satu minggu dalam periode. Minggu pertama dan terakhir boleh pendek. */
export interface JadwalMinggu {
  w: number
  label: string
  mulai: string
  selesai: string
  jml_hari: number
}

/** Hari kerja satu customer, dipecah per minggu. */
export interface JadwalKalender {
  customer: string
  wd: number
  wd_terpakai: number
  /** Sabtu yang sudah masuk jadwal reguler customer ini. */
  sabtu_kerja: string[]
  libur_paksa: string[]
  /** true kalau Sabtu-nya reguler, jadi tidak ikut skema recovery. */
  pakai_sabtu: boolean
  minggu: { w: number; hari: number }[]
}

/** Satu lot yang digeser ke akhir pekan. */
export interface JadwalGeser {
  part_number: string
  op: string | null
  jig: string | null
  customer: string
  /** tanggal asalnya, hari kerja yang kelebihan jam */
  dari: string
  dari_hari: string
  qty: number
  qty_lot: number
  jam: number
}

/** Satu hari akhir pekan yang dipakai recovery. */
export interface JadwalHariRecovery {
  tanggal: string
  nama_hari: string
  jam_part: number
  jam_total: number
  /** jam hari itu termasuk titipan minggu lain */
  jam_hari_total: number
  /** true kalau hari ini di luar minggu yang sedang ditutup */
  luar_minggu: boolean
  qty: number
  lot: JadwalGeser[]
}

export interface JadwalRecovery {
  w: number
  jam_kurang: number
  jam_pulih: number
  sisa: number
  jam_geser: number
  cukup: boolean
  hari: JadwalHariRecovery[]
  alasan: string
  catatan: string
}

export interface JadwalRobotMinggu {
  w: number
  label: string
  mulai: string
  selesai: string
  hari_aktif: number
  hari_lewat: number
  jam_butuh: number
  jam_tersedia: number
  jam_puncak: number
  kurang: number
  achieve: boolean
}

export interface JadwalRobot {
  machine: string
  label: string
  jam_puncak: number
  /** blok baku terkecil yang menampung jam puncak; null kalau tidak ada */
  saran_blok: number | null
  gun_type: string | null
  blok_shift: number
  tpt_jam: number
  jam_tetap: number
  mp_day: number
  minggu: JadwalRobotMinggu[]
  recovery: JadwalRecovery[]
  total_kurang: number
  total_pulih: number
  sisa_kurang: number
  achieve: boolean
}

export interface JadwalPart {
  machine: string
  label: string
  part_number: string
  part_name: string | null
  op: string | null
  model: string | null
  jig: string | null
  customer: string
  customer_wd: number
  lot_size: number
  net_order: number
  jam_lot: number
  hari_pakai: number
  hari_kerja: number
  minggu: { w: number; hari: number; qty: number; jam: number }[]
  total_qty: number
  kurang_qty: number
  sabtu_reguler: boolean
}

export interface Jadwal {
  glc_id: number
  periode: string
  status: string
  beku: boolean
  minggu: JadwalMinggu[]
  kalender: JadwalKalender[]
  robot: JadwalRobot[]
  part: JadwalPart[]
  ringkas: {
    robot: number
    robot_tidak_achieve: number
    robot_pulih: number
    robot_sisa_kurang: number
    jam_kurang: number
    jam_pulih: number
    part: number
    part_kurang_qty: number
  }
}
