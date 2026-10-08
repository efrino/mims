// types/Public/Welding/master.ts

export type MsWeldingCategory   = 'WELDING' | 'INHOUSE' | 'OUTHOUSE' | 'SINGLE FINISH' | 'IFPD' | 'CKD' | 'MATERIAL' | 'SCRAP'
export type MsWeldingLinePress  = string
// Klasifikasi manual khusus MATERIAL/IFRM — tak bisa diturunkan dari data SAP,
// user isi sendiri lewat form (lihat gpart_status di Tambah/Edit Part).
export type MsWeldingGpart      = 'GPART' | 'NON_GPART'
// Tipe part khusus layer IFPD (barang jadi) — manual, disimpan langsung di
// ms_welding (beda dari `ifpd_group` filter tab yg selama ini di-derive dari
// REMARK majsf_rundown.stocks, cross-DB & bisa nggak sinkron).
export type MsWeldingIfpdType   = 'SINGLE_FINISH' | 'SUB_ASSY' | 'SEMI_SUB_ASSY' | 'MODULE'

export interface MsWelding {
    id?: number
    job_number_delivery: string | null
    part_number_delivery: string | null
    job_number: string | null
    part_number: string
    alias: string | null
    part_name: string | null
    category: MsWeldingCategory | null
    gpart: MsWeldingGpart | null
    op: number | null
    part_number_mix: string
    parent_part_mix: string | null
    is_wip: boolean
    status_part: 'FP' | 'WIP'
    layer: string | null
    line_press: MsWeldingLinePress | null
    vendor: string | null
    vendor_2: string | null   // supplier cadangan/alternatif ke-2
    vendor_3: string | null   // supplier cadangan/alternatif ke-3
    machine: string | null
    machine_alt: string | null   // mesin alternatif/cadangan (2026-09-18); riwayat = ms_welding_change_log
    jig: string | null
    stroke_mili_spot: number | null
    uph: number | null
    cycle_time_sec: number | null
    qty_kbn: number
    /** Part COMMON: qty KBN jalur WIP (auto FPB qty_kbn mother); qty_kbn = jalur FP. */
    qty_kbn_wip?: number | null
    lot_cycle: number | null
    qty_unit: number | null
    stock: number | null
    uom: string | null          // satuan (PCS/KG/SHT/dll) — general utk semua category, bisa diisi manual di form; SCRAP diisi otomatis dari SAP
    scrap_ratio: number | null  // qty scrap per unit produksi (dari SAP) — khusus kategori SCRAP
    pallet_type: string | null   // teks bebas, mis. "Pallet Besi"
    pallet_image: string | null  // diisi otomatis via endpoint upload_pallet_image
    ifpd_type: MsWeldingIfpdType | null  // khusus layer IFPD — SINGLE FINISH/SUB-ASSY/SEMI SUB-ASSY/MODULE
    next_machine?: string | null // mesin mother langsung (list dipisah koma); read-only, dihitung backend
    variant_count?: number       // jumlah varian delivery aktif (ms_welding_delivery_variant); read-only, dihitung backend
    variant_customers?: string | null // customer semua varian aktif (list dipisah koma, default dulu); read-only, dihitung backend
    variant_jobs?: string | null      // job number semua varian aktif (list dipisah koma, default dulu); read-only, dihitung backend
    variant_alt?: string | null       // NOMOR|CUSTOMER per varian aktif, dipisah ';;' — chip nomor lain (1 produk)
    siblings?: string | null          // baris lain 1 produk (suffix beda): PN|line/mesin|customer, dipisah ';;'
    bom_verified?: BomVerifiedInfo | null // BOM part ini terverifikasi (list master)
    rel_verified?: boolean            // tercantum di BOM terverifikasi milik mother-nya
    nut_warnings?: string[]           // peringatan NUT (spec mesin & nut feeder) — baris WELDING di tabel
    dup_of?: number[] | null          // id baris kembar aktif (part number + area + OP sama) — saran merge
    merged_into_id?: number | null // terisi bila part ini sudah dilebur jadi varian part lain (runout)
    merged_into?: string | null    // part_number basis (kalau merged_into_id terisi); read-only, dihitung backend
    variant_active?: number | null // 1 = varian ini masih dipakai kirim, 0 = varian nonaktif; null = baris bukan varian
    next_process?: string | null // area proses mother langsung (WIP) — bisa list dipisah koma kalau multi-mother beda area; read-only, dihitung backend
    next_runout?: string | null  // mother langsung yg runout: "pn|area|mesin;..." (info, bukan next process aktif)
    fp_mothers?: string | null               // FP yg dirakit ke part lain (kandidat part common)
    is_common?: boolean                      // part common: dirakit ke part lain + dikirim langsung (2 jalur)
    mother_customer?: string | null          // customer mother (jalur rakit part common)
    common_area?: string | null              // jalur rakit part common: area / mesin / model mother part lain
    common_machine?: string | null
    common_model?: string | null
    mother_model?: string | null // model mother langsung (list dipisah koma) — dipakai tab CKD; read-only, dihitung backend
    /** Press/material: customer, model & job part yg akhirnya dikirim (telusur mother; backend). */
    end_customer?: string | null
    end_model?: string | null
    end_job?: string | null
    model: string | null
    ckd_type: string | null      // khusus CKD — NUT/BOLT/CLIP/SCREW/WASHER/STUD/BRACKET/PIN/LAINNYA
    car_name: string | null
    customer_1: string | null
    customer_2: string | null
    customer_3: string | null
    area: string
    image: string | null
    image_url?: string | null
    runout_date: string | null
    is_runout: boolean
    created_by?: string | null
    created_at?: string | null
    last_user_updated?: string | null
    updated_at?: string | null
    // Papan pemasangan WIP (steker ↔ stop kontak) — flag dari endpoint /unpaired
    has_parent?: number   // 1 = WIP sudah punya parent valid
    has_child?: number    // 1 = part sudah punya WIP child
    mother_count?: number // jumlah parent/mother (relasi ms_welding_parents sbg child) — kolom tabel IFRM/CKD
    total_proses?: number // jumlah proses/line — diisi otomatis oleh modal "Generate Routing" (save_route)
}

// Galeri media TAMBAHAN per part (Spec Modal) — TERPISAH dari image/pallet_image
// (itu tetap cover tunggal dipakai di tabel/tree/form). Ini cuma foto/video ekstra.
/** 6 sisi foto "3D" — wajah kubus foto di Spec Modal (null = foto galeri biasa). */
export type MediaViewSide = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'

export interface MsWeldingMedia {
    id: number
    part_id: number
    kind: 'part' | 'pallet'
    media_type: 'image' | 'video' | 'model'   // model = 3D .glb (TripoSR); file_path '' = masih antre
    view_side: MediaViewSide | null
    file_path: string
    file_path_original?: string | null  // terisi = background sudah dihapus (file_path = PNG transparan)
    bg_pending?: boolean                // hapus-bg masih di antrean background server
    url?: string
    sort_order: number
    created_at: string
    updated_by?: string | null          // model 3D: 'triposr' = otomatis dari foto, selain itu upload user
}

export interface MsWeldingTreeNode extends MsWelding {
    children?: MsWeldingTreeNode[]   // turunan (ke bawah)
    parents?: MsWeldingTreeNode[]    // mother/parent (ke atas, bisa banyak/bercabang)
    rel_qty?: number | null          // qty relasi ke parent tempat node ini dirender (ms_welding_parents.qty) — MATERIAL/SCRAP: konsumsi per mother
    rel_route_seq?: number | null    // langkah routing parent tempat node ini dipasang (NULL = 1)
    rel_route_split?: string | null  // qty per mesin "1:1,2:1" (seq:qty) bila dibagi ke >1 mesin
    route_steps?: RouteStep[] // routing mesin node ini (hanya node yg punya anak) + nut per mesin dari spec
    rel_route_seq_auto?: number | null // mesin tebakan dari spec (nut hanya dipasok 1 mesin) bila belum dipilih
    ifpp_source?: { category: string; area: string | null } | null // entry INHOUSE/OUTHOUSE: kategori menurut data IFPP (null = tak ada)
    compatible_machines?: { machine: string; area: string | null; feeder: boolean }[] // mesin yg spec-nya memuat nut ini (CKD), area induk dulu
    _not_found?: boolean             // parent tidak ditemukan di DB
    ckd_count?: number | null
    bom_verified?: BomVerifiedInfo | null  // BOM part_number ini sudah diverifikasi (berlaku lintas area/tree)
    rel_verified?: boolean                 // tercantum di BOM terverifikasi milik parent langsungnya (tree children)
    rel_sap?: boolean                      // pasangan parent→node ada di BOM SAP (cache ms_welding_bom)
    part_name_inherited?: boolean    // part_name kosong → diwarisi dari part bernomor sama / varian P (tampilan saja)
    nut_warnings?: string[]        // aturan NUT FEEDER: WELDING di mesin nut feeder wajib INHOUSE/OUTHOUSE + NUT
}

export interface BomVerifiedInfo {
    verified_by: string
    verified_at: string
}

// ── BOM terverifikasi (GET /welding_master/bom_verify) ──
// match: exact = SAP == anak master · via_wip = SAP "P<x>" ↔ WIP welding "<x>"
// (hierarki M→P→tanpa P) · sap_only / master_only = cuma di satu sisi · manual = tambahan user
export type BomVerifyMatch = 'exact' | 'via_wip' | 'sap_only' | 'master_only' | 'manual'

/** Langkah routing + nut yg tercatat di spec mesin (welding_spec_machine). */
export interface RouteStep { seq: number; machine: string; nuts?: { pn: string; code: string; feeder: boolean }[] }

export interface BomVerifyRow {
    route_seq_auto?: number | null  // mesin tebakan spec (nut hanya dipasok 1 mesin di routing)
    route_split?: string | null     // "1:1,2:1" bila komponen dibagi ke >1 mesin
    route_seq?: number | null       // mesin ke-n routing part (NULL/1 = mesin pertama)
    child_part_number: string
    sap_part_number?: string | null
    child_name: string | null
    category?: string | null
    sap_qty: number | null
    qty: number
    uom: string | null
    match?: BomVerifyMatch
    source?: 'SAP' | 'ADJUST'
    include?: boolean
}

export interface BomVerifyData {
    route_steps?: { seq: number; machine: string }[]
    area?: string | null              // area part ini (urutan mesin hanya utk WSS)
    jig?: string | null               // jig part ini (area robot) — komponen ditaruh di sini
    jig_area?: boolean                // part WELDING area robot (CO/SA) → kolom Jig; press/WSS tidak
    part_number: string
    tables_ready: boolean
    verified: (BomVerifiedInfo & { note: string | null; items: BomVerifyRow[] }) | null
    proposal: BomVerifyRow[]
    sap_synced_at: string | null
    nut_rule: { machines: string[]; nuts: string[]; by_step?: { seq: number; machine: string; nuts: string[] }[] } | null  // mesin nut feeder → wajib INHOUSE/OUTHOUSE + salah satu nut ini
}

// Struktur: entry node (+children ke bawah) + parents (bercabang ke atas).
// Satu WIP bisa punya banyak mother → `parents` adalah pohon, bukan rantai linear.
export interface MsWeldingTree {
    entry_id: number
    node: MsWeldingTreeNode          // node yang diklik, sudah include children
    parents: MsWeldingTreeNode[]     // semua mother langsung; tiap node punya `parents` sendiri
}

export interface MsWeldingStats {
    total_rows: number
    total_parts: number
    total_areas: number
    total_fp: number
    total_wip: number
    total_obsolete: number
    total_variant: number
}

// ── Machine Map — visualisasi mesin/line per area (auto dari data ms_welding) ──
export interface MachineMapMachine {
    machine: string
    part_count: number
    jig_codes?: string[]   // WELDING (area ROBOT) — kode jig di mesin ini (mis. ["1","2","3"]), dot per kode, bisa diklik
    feeder_count?: number  // WELDING (area WSS) — jumlah part CKD yg di-feed ke mesin ini (via BOM)
    line_group?: string | null  // WELDING — grup hierarki Master Mesin (A/B/RSW/...), utk tampilan "Grup"
    machine_no?: string | null  // WELDING — nomor di dalam grup
    row_idx?: number       // WELDING free-grid — posisi baris (Y), lihat MachineMapGroup.machines
    col_idx?: number       // WELDING free-grid — posisi kolom (X)
    status?: 'NORMAL' | 'TROUBLE'  // WELDING — status backup/failover, lihat ms_machine_status
    backup_machine?: string | null // WELDING — mesin yg lagi nampung part-nya (kalau status=TROUBLE)
}

// Kandidat mesin backup (failover) — mesin lain yg berbagi ≥1 CKD feeder yg
// sama (diturunkan dari BOM, BUKAN spek mesin manual), lihat machine-map.vue.
export interface BackupCandidate {
    machine: string
    area: string
    shared_ckd: number
    part_count: number
}

// Detail status trouble/backup 1 mesin (ms_machine_status) — null kalau normal/belum pernah di-set.
export interface MachineStatusRow {
    machine: string
    status: 'NORMAL' | 'TROUBLE'
    backup_machine: string | null
    reason: string | null
    moved_parts: number
    changed_by: string | null
    changed_at: string | null
}
// "family" = LINE (dulu auto-derive dari pola nama, sekarang sumbernya tabel
// master ms_line_machine_map — hasil drag-drop manual user, lihat machine-map.vue).
// Dipakai INHOUSE (PRESS) & IFRM saja — WELDING sekarang pakai `machines` (grid bebas).
export interface MachineFamily {
    family: string
    machines: MachineMapMachine[]
}
export interface MachineMapGroup {
    area: string
    category: 'WELDING' | 'INHOUSE' | 'IFRM'
    label: string
    families?: MachineFamily[]       // INHOUSE & IFRM
    machines?: MachineMapMachine[]   // WELDING — denah bebas row_idx/col_idx, BUKAN grup per-line lagi
}
export interface MachinePartRow {
    id: number
    part_number: string
    part_name: string | null
    area: string
    machine?: string | null      // WELDING
    jig?: string | null          // WELDING, khusus area ROBOT — dasar visualisasi jig
    line_press?: string | null   // INHOUSE
    process_step?: number        // INHOUSE — mesin ini step ke-berapa dari urutan proses part
    process_total?: number       // INHOUSE — total proses part ini
    uph: number | null
    cycle_time_sec: number | null
    qty_kbn: number
    lot_cycle: number | null
    status_part: 'FP' | 'WIP'
}
// Payload simpan hasil drag-drop re-mapping (POST line_map).
// PRESS: {line, machine, sort_order}. WELDING (free-grid): {machine, row_idx, col_idx}.
export interface LineMapRow {
    line?: string
    machine: string
    sort_order?: number
    row_idx?: number
    col_idx?: number
}

// CKD terpasang di mesin (master, area WSS, ms_machine_ckd) — SUMBER
// KEBENARAN "CKD apa yg ada di mesin ini" (bukan lagi cuma derivasi BOM).
// Mesin bisa punya >1 CKD aktif; auto-link BOM ke part cuma jalan kalau
// PERSIS 1 CKD aktif pas part di-assign ke mesin itu (lihat M_weld::_auto_link_machine_ckd).
export interface MachineCkdRow {
    id: number
    area_scope: string
    machine: string
    ckd_id: number
    is_active: number // 0/1 dari MySQL TINYINT
    sort_order: number
    part_number: string
    part_name: string | null
}

// Jig master (per mesin, area ROBOT) — entitas beneran (ms_jig), bukan dekorasi.
// Part-to-jig assignment tetap di ms_welding.jig (part "pindah jig" = update kolom itu).
// Part CKD (nut/bolt/clip dst) yg "di-feed" ke 1 mesin WELDING (area WSS) —
// diturunkan dari relasi BOM ms_welding_parents, bukan tabel sendiri. Dipakai
// sbg FALLBACK read-only kalau mesin belum pernah di-mount CKD manual.
export interface MachineFeederRow {
    id: number
    part_number: string
    part_name: string | null
    model: string | null
}

export interface JigRow {
    id: number
    area_scope: string
    machine: string
    jig_code: string
    is_active: number // 0/1 dari MySQL TINYINT
    sort_order: number
}

export interface MsWeldingListResult {
    success: boolean
    data: MsWelding[]
    total: number
    page: number
    per_page: number
    last_page: number
}

export interface MsWeldingListParams {
    page?: number
    per_page?: number
    layer?: string | null
    area?: string | null
    // Daftar area (comma-separated), lintas layer — dipakai tab "Semua" di IFPP/IFPW
    // supaya FP (layer=IFPD) dgn area yg termasuk grup itu ikut kebawa, bukan cuma
    // baris layer=IFPP/IFPW. Beda dari `area` (exact 1 nilai, dipakai saat sub-area dipilih).
    areas?: string | null
    ifpd_group?: 'SINGLE_FINISH' | 'SUB_ASSY' | 'SEMI_SUB_ASSY' | 'MODULE' | null
    status_part?: 'FP' | 'WIP' | null
    is_wip?: 0 | 1 | null
    search?: string | null
    sort_by?: 'part_number' | 'area' | 'model' | 'updated_at'
    sort_dir?: 'asc' | 'desc'
    hide_obsolete?: 0 | 1
    only_obsolete?: 0 | 1
    variant_mode?: 'hide' | 'show' | 'only'   // baris varian (hasil lebur): sembunyikan (default) / tampilkan / hanya varian
    // Filter kolom multi-select (chip), comma-separated — difilter SERVER-SIDE
    // supaya tabel tetap paginasi normal (tak perlu tarik ribuan baris ke client).
    col_part_number?: string | null
    col_job?: string | null
    col_model?: string | null
    col_ckd_type?: string | null
    col_area?: string | null
    col_machine?: string | null
    col_customer?: string | null
    col_part_combo?: string | null
    col_job_combo?: string | null
    col_area_combo?: string | null
    col_next_combo?: string | null
    col_customer_combo?: string | null
}

export type MsWeldingFormData = Omit<MsWelding, 'id' | 'created_by' | 'created_at' | 'last_user_updated' | 'updated_at'>

// ── Rekonsiliasi ms_welding ↔ BOM SAP ──
export interface ReconcileChange { old: string | null; new: string }

export interface ReconcileAdd {
    part_number: string
    part_number_mix: string
    parent_part_mix: string | null
    parent_id?: number | null // dipakai server utk bikin relasi pivot ms_welding_parents saat apply
    alias?: string | null
    part_name: string | null
    category: MsWeldingCategory | null
    layer: string | null
    is_wip: number
    status_part: 'FP' | 'WIP'
    area: string | null
    model: string | null
    car_name: string | null
    customer_1: string | null
    customer_2: string | null
    customer_3: string | null
    // info-only (UI)
    mtart?: string | null
    sap_name?: string | null
    bom_qty?: number | null
    meins?: string | null
    classify?: MsWeldingCategory | 'WELDING'
    _global_note?: string | null
    from_override?: boolean
    // SCRAP/MATERIAL — rasio konsumsi & satuan dari SAP, ikut tersimpan ke master.
    uom?: string | null
    scrap_ratio?: number | null
    // WELDING/INHOUSE/OUTHOUSE — qty_unit (WIP per FP) diisi otomatis dari BOM qty SAP.
    qty_unit?: number | null
}

export interface ReconcileUpdate {
    id: number
    part_number: string
    mtart?: string | null
    changes: Record<string, ReconcileChange>
}

export interface ReconcileLink {
    id: number
    part_number: string
    part_name: string | null
    category: MsWeldingCategory | null
    area: string | null
    mtart?: string | null
    bom_qty?: number | null
    meins?: string | null
    connect_to_parent: string
    connect_to_parent_id?: number
    _target_note?: string | null     // nut diarahkan ke WIP yg mesinnya nut feeder (bukan ke holder)
}

export interface ReconcileReparent {
    id: number
    part_number: string
    from_parent: string    // part number induk sekarang (press/IFPP)
    to_parent: string      // part number induk tujuan (WSS welded)
    to_parent_mix: string
}

export interface ReconcilePreview {
    success: boolean
    holder: { id: number; part_number: string; part_number_mix: string; area: string | null; model: string | null }
    adds: ReconcileAdd[]
    links?: ReconcileLink[]
    updates: ReconcileUpdate[]
    reparents: ReconcileReparent[]
    /** WSS yg belum memakai press P<x> dari BOM SAP → sisipkan: M → P → WSS. */
    press_inserts?: ReconcilePressInsert[]
    /** WSS yg BOM SAP-nya sedang diambil (CKD/nut-nya muncul di preview berikutnya). */
    wss_sap_pending?: string[]
    /** Baris bernomor sama di AREA LAIN (tak dihitung "sudah ada") — info, cek duplikat. */
    same_pn_other_area?: import('@/components/welding/master/DuplicateCompare.vue').DupRow[]
    holder_compare?: import('@/components/welding/master/DuplicateCompare.vue').DupRow | null
    /** Kunci kombinasi area baris aktif (mis. "CO ADM|OUTHOUSE") + tanda "semua aman" bila ada. */
    dup_area_key?: string | null
    dup_ok?: { created_by: string | null; created_at: string; note: string | null } | null
    in_master_only: { id: number; part_number: string; alias: string | null }[]
}
export interface ReconcilePressInsert {
    key: string
    wss_id: number
    wss_part_number: string
    press_id: number | null          // null = press belum ada di master (ikut di "Tambah")
    press_part_number: string
    press_name: string | null
    press_area: string | null
    bom_qty: number | null
    meins: string | null
    move_children: { id: number; part_number: string; qty: number | null }[]
}

// ── "Mother by SAP" (where-used, kebalikan dari BOM/"Children by SAP") ──
export interface MotherBySapMatch {
    id: number
    part_number: string
    part_number_mix: string
    category: MsWeldingCategory | null
    area: string | null
    model: string | null
    car_name: string | null
    is_current_parent: boolean
}

export interface MotherBySapCandidate {
    mother_matnr: string
    mother_name: string | null
    werks: string | null
    lgort: string | null
    bom_qty: number | null
    meins: string | null
    stlnr: string | null
    level: string | null
    matches: MotherBySapMatch[]
}

export interface MotherBySapResult {
    success: boolean
    message?: string | null
    part_number: string
    candidates: MotherBySapCandidate[]
    pending?: boolean   // masih diambil dari SAP (background) — poll ulang
    stale?: boolean     // data cache sudah lewat 12 jam, refresh background jalan diam2
    stale_h?: number | null
}
// Pratinjau "Pindah Area" (GET welding_master/area_move_preview) — data mutasi_weld
// yang sedang berjalan di area lama & akan IKUT dipindah (bukan dihapus engine).
export interface AreaMovePreviewPeriod {
    period_year: number
    period_month: number
    rows_total: number
    days_actual: number
    actual_total: number
    lock_initial_stock: number
    initial_stock: number | null
    adjust_days: number
    locked_plan_days: number
    conflict_days: number
}
export interface AreaMovePreview {
    part_id: number
    mutasi_key: string
    from: string
    to: string
    is_fp: boolean
    periods: AreaMovePreviewPeriod[]
    has_running: boolean
}

// ── Komparasi daftar part (paste Excel) vs master pada filter aktif — POST welding_master/compare
export interface PartCompareMaster {
    id: number
    part_number: string
    part_number_delivery: string | null
    part_number_mix: string | null
    part_name: string | null
    job_number: string | null
    area: string | null
    category: string | null
    layer: string | null
    is_wip: number
    qty_kbn: number | null
    customer_1: string | null
    model: string | null
    variant_numbers: string | null
    child_count: number           // relasi anak (ms_welding_parents parent_id = id)
    mother_count: number
    bom_cached: number            // >0 = BOM SAP part ini pernah diambil & sukses (sap_bom_cache ready)
    bom_synced: number            // jumlah child BOM tersinkron di ms_welding_bom (tab BOM SAP hierarki)
    sap?: PartCompareSap | null   // diisi utk master_only
}

/** Hasil "Get children by SAP" 1 part (POST welding_master/compare_children_sap). */
export interface CompareChildrenSapResult {
    success: boolean
    message?: string
    part_number: string
    holder_id: number
    lgort: string
    from_cache: boolean
    source: 'cache' | 'synced' | 'sap'   // asal data BOM: cache ≤12 jam / ms_welding_bom tersinkron / fetch SAP
    elapsed_ms: number
    sap_children: number
    adds: number
    links: number
    updates: number
    children: { matnr: string; name: string | null; mtart: string | null; qty: number | null; meins: string | null }[]
    applied?: { inserted: number; updated: number; linked: number; reparented: number; errors: string[] }
}
/** Material SAP (majsf_rundown.stocks) — null = tidak ada di SAP. mtart = daftar layer SAP tempat material ada. */
export interface PartCompareSap { matnr: string; bismt: string | null; name: string | null; mtart: string; remark: string | null }
export interface PartCompareBoth { source: string; line: number; matched_by: string; master: PartCompareMaster; sap: PartCompareSap | null }
export interface PartCompareSourceOnly { source: string; line: number; sap: PartCompareSap | null }
export interface PartCompareResult {
    summary: { source_total: number; source_dup: number; master_total: number; both: number; source_only: number; source_only_in_sap: number; master_only: number; sap_layer: string | null }
    both: PartCompareBoth[]
    source_only: PartCompareSourceOnly[]
    master_only: PartCompareMaster[]
    source_dup: string[]
}

// ── Info Cepat part (GET /welding_master/part_insight) — fase 0 AI Agent, tanpa LLM ──
export interface PartInsight {
    part_number: string
    part_name: string | null
    period: string                   // YYYY-MM (bulan berjalan)
    as_of: string                    // YYYY-MM-DD
    orders: {
        total: number
        lines: { code: string; customer: string | null; job: string | null; orders: number; qty: number }[]
    }
    // Part WIP (tak dipesan langsung): kebutuhan = Σ DN FP tujuan × qty per FP. null utk FP.
    wip_demand: {
        total: number
        lines: { fp: string; fp_name: string | null; dn_fp: number; qty_per_fp: number; kebutuhan: number }[]
    } | null
    production: {
        area: string; plan_month: number; plan_to_date: number; actual_to_date: number
        gap_to_date: number; achievement_pct: number | null; mdfo_month: number; dn_month: number
        demand_month: number              // SUM harian max(DN, MDFO) — plan minimal (Aturan #3)
        plan_cover_pct: number | null     // plan sebulan ÷ demand
    }[]
    stock: {
        area: string; stock_today: number | null; pcs_per_day: number; dn_last7: number; days_cover: number | null
        strength_h: number | null         // stok × 16 / pcs per hari (jam)
        safety_min_h: number; safety_max_h: number; safety_stock: number | null
        status: 'minus' | 'below' | 'safe' | 'over' | null
    }[]
    bom: {
        verified: { by: string; at: string } | null
        components: number
        sap_only: number
        nut_warnings: string[]
    }
}

// ── Tanya AI (POST /welding_master/ai_chat) — agent read-only ──
export interface AiChatSource { tool: string; args: Record<string, unknown> }
export interface AiChatMessage {
    role: 'user' | 'assistant'
    content: string
    sources?: AiChatSource[]
    charts?: AiChart[]
    tables?: AiTable[]
    /** Pilihan lanjutan (chip) — mis. pilih customer sebelum query berat. */
    options?: AiOption[]
    ms?: number
}
// Grafik dilampirkan backend dari hasil tool (mis. get_trend), bukan dibuat model.
export interface AiChart {
    type: 'line'
    title: string
    categories: string[]
    series: { name: string; data: (number | null)[] }[]
    note?: string
}
// Tabel terstruktur dari tool daftar (list_alerts / top_dn) — angka persis dari DB.
export interface AiTableColumn { key: string; label: string; type: 'part' | 'text' | 'number' | 'percent' | 'hours'; unit?: string | null }
export interface AiTable {
    title: string
    columns: AiTableColumn[]
    rows: Record<string, string | number | null>[]
    stats: { label: string; value: number; unit?: string }[]
    thresholds: { hours_min: number | null; percent_ok: number; percent_warn: number }
}
export interface AiOption { label: string; q: string; hint?: string }
export interface AiChatResult { answer: string; sources: AiChatSource[]; charts: AiChart[]; tables?: AiTable[]; options?: AiOption[]; model: string; ms: number }

// ── MDFO (forecast) vs DN (delivery) — GET /welding_master/part_mdfo_dn ──
export interface PartMdfoDnBucket {
    bucket: string; label: string; start: string
    mdfo: number; dn: number; ratio_pct: number | null
    future: boolean; current: boolean
    dn_complete: boolean              // feed DN bulan itu sudah lengkap (cakupan global ≥ 70%)
}
export interface PartMdfoDn {
    part_number: string
    grain: 'month' | 'week' | 'day'
    from: string; to: string; as_of: string
    derived_from_fp: boolean          // WIP: diturunkan dari FP tujuan × qty per FP
    series: PartMdfoDnBucket[]
    today: { mdfo: number; dn: number }
    summary: {
        mdfo: number; dn: number
        ratio_pct: number | null      // DN / MDFO (bucket lengkap)
        accuracy_pct: number | null   // 100 − rata2 selisih relatif per bucket
        buckets: number; excluded: number; over: number; under: number
        cv_pct: number | null         // variasi rasio antar bucket — makin kecil makin stabil
        bias: string | null
        hint: string | null
    }
    dn_coverage: Record<string, number | null>   // Y-m → cakupan feed DN global (%)
}

/** Serah terima data baris lama → baru (M_weld::handover). */
export interface HandoverPlan {
    from: string; to: string
    mothers: { id: number; label: string; qty: number | string | null }[]
    children: { id: number; label: string; qty: number | string | null }[]
    variants: { id: number; label: string }[]
    media: number
    mutasi: { possible: boolean; move: number; conflict: number }
}
export interface HandoverResult { success: boolean; message?: string; preview?: HandoverPlan; applied?: HandoverPlan; mutasi_moved?: number }

/** GET welding_master/delete_check — ringkasan sebelum hapus part. */
export interface DeleteCheck {
    part_number: string
    delivered_type: boolean
    numbers: string[]
    jobs: string[]
    deliveries: { source: string; count: number; qty: number; last: string | null }[]
    last_delivery: string | null
    months_since: number | null
    last_production: { periode: string; actual: number } | null
    mothers: { id: number; part_number: string; area: string | null; runout: boolean }[]
    active_mothers: number
    children: number
}

/** GET welding_master/dup_merge — saran merge baris kembar. */
export interface DupMergeSide { id: number; part_number: string; area: string | null; job: string | null; machine: string | null }
export interface DupMergeSuggest { success: boolean; message?: string; keep?: DupMergeSide; drop?: DupMergeSide; preview?: HandoverPlan | null }
