// services/Public/Welding/machineMapService.ts
//
// Service khusus fitur "Peta Mesin & UPH" — dipisah dari masterService.ts
// (modular, ngikutin controller/model backend-nya: Welding_machine_map.php +
// M_machine_map.php). Update UPH/Cycle Time part TETAP lewat
// masterService.update() (endpoint welding_master/update yg sudah ada) —
// service ini cuma baca peta mesin + daftar part per mesin.

import axios from 'axios'
import type { MachineMapGroup, MachinePartRow, LineMapRow, JigRow, MachineFeederRow, BackupCandidate, MachineStatusRow, MachineCkdRow } from '@/types/Public/Welding/master'

const BASE_URL = 'http://192.168.10.67/majsf_rest_api/api'

export default {
    async getMachineMap(): Promise<MachineMapGroup[]> {
        const res = await axios.get(`${BASE_URL}/welding_machine_map/machine_map`)
        return res.data.data ?? []
    },

    async getMachineParts(category: string, machine: string): Promise<MachinePartRow[]> {
        const res = await axios.get(`${BASE_URL}/welding_machine_map/machine_parts`, { params: { category, machine } })
        return res.data.data ?? []
    },

    // Simpan hasil drag-drop re-mapping Line->Mesin (timpa total utk 1 area_scope
    // — 'PRESS' utk grup INHOUSE, atau nama area WELDING spt 'WSS ADM'/'ROBOT CO').
    async saveLineMap(areaScope: string, rows: LineMapRow[]): Promise<{ success: boolean; message: string }> {
        const res = await axios.post(`${BASE_URL}/welding_machine_map/line_map`, { area_scope: areaScope, rows })
        return res.data
    },

    async getJigs(areaScope: string, machine: string): Promise<JigRow[]> {
        const res = await axios.get(`${BASE_URL}/welding_machine_map/jigs`, { params: { area_scope: areaScope, machine } })
        return res.data.data ?? []
    },
    async saveJig(payload: { area_scope: string; machine: string; jig_code: string; is_active: boolean; sort_order: number }): Promise<{ success: boolean; message: string }> {
        const res = await axios.post(`${BASE_URL}/welding_machine_map/jig_save`, payload)
        return res.data
    },
    /** Ganti nomor jig — part yg memakai nomor lama ikut pindah (backend). */
    async renameJig(id: number, jig_code: string): Promise<{ success: boolean; message: string }> {
        const res = await axios.post(`${BASE_URL}/welding_machine_map/jig_rename`, { id, jig_code })
        return res.data
    },
    async deleteJig(id: number): Promise<{ success: boolean; message: string }> {
        const res = await axios.post(`${BASE_URL}/welding_machine_map/jig_delete`, { id })
        return res.data
    },

    // Feeder CKD (area WSS) — part yg di-feed ke 1 mesin, diturunkan dari BOM.
    async getFeeders(machine: string): Promise<MachineFeederRow[]> {
        const res = await axios.get(`${BASE_URL}/welding_machine_map/feeders`, { params: { machine } })
        return res.data.data ?? []
    },

    // Urutan area WELDING top-to-bottom (drag-reorder manual, biar match denah lantai).
    async saveAreaOrder(areas: string[]): Promise<{ success: boolean; message: string }> {
        const res = await axios.post(`${BASE_URL}/welding_machine_map/area_order`, { areas })
        return res.data
    },

    // ── Backup mesin (failover) — kompatibilitas diturunkan dari CKD feeder yg sama ──
    async getMachineStatus(machine: string): Promise<MachineStatusRow | null> {
        const res = await axios.get(`${BASE_URL}/welding_machine_map/machine_status`, { params: { machine } })
        return res.data.data ?? null
    },
    async getBackupCandidates(machine: string): Promise<BackupCandidate[]> {
        const res = await axios.get(`${BASE_URL}/welding_machine_map/backup_candidates`, { params: { machine } })
        return res.data.data ?? []
    },
    async setMachineTrouble(payload: { machine: string; backup_machine: string; reason?: string }): Promise<{ success: boolean; moved: number; message: string }> {
        const res = await axios.post(`${BASE_URL}/welding_machine_map/machine_trouble`, payload)
        return res.data
    },
    async setMachineRecover(machine: string): Promise<{ success: boolean; message: string }> {
        const res = await axios.post(`${BASE_URL}/welding_machine_map/machine_recover`, { machine })
        return res.data
    },
    // Pra-konfigurasi mesin cadangan (BUKAN insiden aktif) — dipakai MachinePickerModal
    // pas assign mesin utama part. Ditolak backend kalau mesin lagi status TROUBLE.
    async saveMachineBackup(machine: string, backupMachine: string | null): Promise<{ success: boolean; message: string }> {
        const res = await axios.post(`${BASE_URL}/welding_machine_map/machine_backup_save`, { machine, backup_machine: backupMachine ?? '' })
        return res.data
    },

    // ── CKD terpasang di mesin (master, area WSS) — sumber kebenaran baru,
    // bukan lagi cuma derivasi BOM. Mirror pola getJigs/saveJig/deleteJig. ──
    async getMachineCkds(areaScope: string, machine: string): Promise<MachineCkdRow[]> {
        const res = await axios.get(`${BASE_URL}/welding_machine_map/machine_ckds`, { params: { area_scope: areaScope, machine } })
        return res.data.data ?? []
    },
    async saveMachineCkd(payload: { area_scope: string; machine: string; ckd_id: number; is_active: boolean; sort_order: number }): Promise<{ success: boolean; message: string }> {
        const res = await axios.post(`${BASE_URL}/welding_machine_map/machine_ckd_save`, payload)
        return res.data
    },
    async deleteMachineCkd(id: number): Promise<{ success: boolean; message: string }> {
        const res = await axios.post(`${BASE_URL}/welding_machine_map/machine_ckd_delete`, { id })
        return res.data
    },
}
