// Tipe untuk Uji Skema GLC Sub Assy Robot Spot.
// Backend: majsf_rest_api/api/glcuji
//
// Alur: DRAFT -> review per robot -> ACCEPTED -> TERBIT jadi versi GLC baru.
// Periode lama tidak pernah ditimpa.

export type UjiStatus = 'DRAFT' | 'REVIEW' | 'ACCEPTED' | 'TERBIT' | 'DITOLAK'
export type ReviewStatus = 'BELUM' | 'OK' | 'REVISI'
export type TargetStatus = 'LOLOS' | 'SPM' | 'PECAH OP' | 'MUSTAHIL' | 'TIDAK PRODUKSI'


/**
  * Parameter pembentuk CT, mengikuti rumus R&D:
  *   CT/spot = T.travel + T.squeeze + (N.pulse x T.weld) + T.cool + T.hold + T.motion
  *   T.travel = 60 / SPM ;  T.motion = jarak antar spot (mm) / 1000
  */
export interface GlcParamCt {
  id: number
  area_code: string
  /** RND = rumus R&D (squeeze/pulse/hold + SPM). LAMA = Ʃspot x waktu gun + moving 1x per OP */
  dasar_rumus: 'RND' | 'LAMA'
  freq_pln: number
  squeeze_cycle: number
  n_pulse: number
  cool_cycle: number
  welding_cycle: number
  hold_cycle: number
  /** stroke per menit, buka-tutup gun */
  spm: number
  /** jarak antar spot baku, dipakai kalau part tidak punya angka sendiri */
  jarak_spot_mm: number
  /** motion pulang ke home, sekali tiap OP */
  pulang_home_dtk: number
  /** pindah WIP ke OP berikutnya di robot yang sama */
  /** pindah WIP ke OP berikutnya di robot lain */
  target_uph: number
  // ---- angka rumus lama, hanya terpakai kalau dasar_rumus = LAMA ----
  /** waktu 1x stroke gun */
  gun_stroke_dtk: number
  up_slope_cycle: number
  down_slope_cycle: number
  /** welding time baku, dipakai kalau part tidak punya angka sendiri */
  welding_baku_cycle: number
  /** moving robot, ditambahkan sekali di akhir tiap baris OP */
  moving_dtk: number
  faktor_kecepatan: number
  updated_at: string | null
  updated_by: string | null
  // turunan dari backend
  cycle_detik: number
  las_detik: number
  travel_detik: number
  motion_detik: number
  ct_spot_detik: number
  /** las + motion; lantai yang tetap ada walau SPM dinaikkan */
  ct_spot_minimum: number
  /** penutup sekali tiap OP: pulang home (R&D) atau moving robot (lama) */
  penutup_op_dtk: number
  spot_maks: number
}

export interface GlcIstirahat {
  id: number
  urutan: number
  jam_mulai: string
  durasi_menit: number
  keterangan: string | null
  aktif: 0 | 1
}

/** Master kombinasi: part berlabel sama = satu rangkaian tandem/aliran. */
export interface GlcKombinasi {
  id: number
  machine: string
  part_number: string
  op: string
  kombinasi: string | null
  /** TSKK wajib bila anggota kombinasi beda part */
  tskk_no: string | null
  tskk_tanggal: string | null
  tskk_file: string | null
  dandori_awal_dtk: number
  keterangan: string | null
}

export interface GlcUji {
  id: number
  area_code: string
  nama: string
  periode: string
  periode_type: string
  glc_id_sumber: number
  status: UjiStatus
  sumber_ct: 'HITUNG' | 'MASTER'
  mode_beban: '1 HARI' | 'PER SHIFT'
  shift: 'DAY' | 'NIGHT'
  jam_mulai: string
  target_uph: number
  robot_total: number
  robot_direview: number
  robot_revisi: number
  kombinasi_total: number
  beban_menit: number
  diam_menit: number
  jeda_menit: number
  robot_lewat_shift: number
  part_total: number
  part_capai_target: number
  catatan: string | null
  hitung_at: string | null
  created_at: string | null
  created_by: string | null
  accepted_at: string | null
  accepted_by: string | null
  terbit_at: string | null
  terbit_by: string | null
  glc_id: number | null
}

export interface GlcUjiRobot {
  id: number
  uji_id: number
  machine: string
  urutan: number
  kombinasi_n: number
  beban_menit: number
  dandori_ulang_dtk: number
  berhenti_kali: number
  jeda_menit: number
  diam_menit: number
  jam_mulai: string | null
  jam_selesai: string | null
  rentang_jam: number
  blok_shift: number
  lewat_shift: 0 | 1
  status_review: ReviewStatus
  catatan: string | null
  reviewed_at: string | null
  reviewed_by: string | null
}

/** Satu tandem = satu rentang waktu. */
export interface GlcUjiKombinasi {
  id: number
  uji_id: number
  machine: string
  urutan: number
  kombinasi: string
  isi: string | null
  op_n: number
  pcs_siklus: number
  ct_siklus_dtk: number
  dandori_awal_dtk: number
  beban_menit: number
  uph_tandem: number
  jam_mulai: string | null
  jam_selesai: string | null
  berhenti_kali: number
  dandori_ulang_dtk: number
  jeda_menit: number
  diam_menit: number
}

/** Potongan waktu: kerja sampai mendekati istirahat, lalu lanjut. */
export interface GlcUjiSegmen {
  id: number
  uji_id: number
  machine: string
  kombinasi: string
  seg: number
  menit_mulai: number
  menit_selesai: number
  kerja_menit: number
  jam_mulai: string | null
  jam_selesai: string | null
  diam_menit: number
  istirahat_jam: string | null
  istirahat_menit: number
  lanjut_jam: string | null
}

/** UPH per part. Rutenya bisa lintas robot. */
export interface GlcUjiPart {
  id: number
  uji_id: number
  part_number: string
  rute: string | null
  op_n: number
  robot_n: number
  robot_list: string | null
  spot_total: number
  spot_op_berat: number
  ct_rute_dtk: number
  /** waktu las murni, tanpa perpindahan WIP */
  ct_proses_dtk: number
  /** waktu perpindahan WIP antar OP sepanjang rute */
  ct_pindah_dtk: number
  pindah_n: number
  ct_op_berat: number
  uph_unit: number
  uph_bottleneck: number
  status_target: TargetStatus
  moving_butuh: number | null
  op_minimum: number
  saran: string | null
}

/** Satu baris OP di layar editor kombinasi. */
export interface GlcPartKombinasi {
  machine: string
  part_number: string
  op: string
  jig: string | null
  spot: number
  qty_kanban: number
  urutan: number
  kombinasi: string | null
  tskk_no: string | null
  tskk_tanggal: string | null
  tskk_file: string | null
  dandori_awal_dtk: number
  keterangan: string | null
  komb_id: number | null
}

export interface GlcDaftarRobot {
  machine: string
  op_n: number
  spot: number
}

/** Setelan jumlah shift per robot. */
export interface GlcShiftRobot {
  id: number | null
  machine: string
  jumlah_shift: 0 | 1 | 2
  catatan: string | null
  updated_at: string | null
  updated_by: string | null
}

export type JenisLangkah = 'MANUAL' | 'AUTO' | 'JALAN' | 'TUNGGU'

/** Satu langkah kerja di TSKK. */
export interface GlcTskkLangkah {
  id?: number
  tskk_id?: number
  urutan: number
  jig: string | null
  uraian: string
  jenis: JenisLangkah
  waktu_detik: number
  /** pekerjaan operator yang berjalan saat robot memproses */
  paralel: 0 | 1
  keterangan: string | null
}

/** Tabel Standar Kerja Kombinasi, diisi manual di web. */
export interface GlcTskk {
  id: number
  machine: string
  kombinasi: string
  no_dokumen: string | null
  tanggal: string | null
  revisi: string | null
  part_no: string | null
  part_name: string | null
  proses: string | null
  dibuat_oleh: string | null
  disetujui_oleh: string | null
  status: 'DRAFT' | 'AKTIF' | 'USANG'
  catatan: string | null
  siklus_detik: number
  auto_detik: number
  manual_detik: number
  paralel_detik: number
  langkah_n: number
  updated_at: string | null
  updated_by: string | null
  langkah?: GlcTskkLangkah[]
}

/** Satu baris riwayat, seperti commit. */
export interface GlcUjiRiwayat {
  id: number
  uji_id: number
  urutan: number
  waktu: string
  aksi: string
  oleh: string | null
  ringkas: string | null
  detail: string | null
}

export interface RingkasReview {
  robot_total: number
  robot_direview: number
  robot_revisi: number
  siap_accept: boolean
}
