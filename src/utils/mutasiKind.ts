// Mutasi Bulanan — FP & WIP dalam 1 tabel: penanda jenis baris + urutan gabungan.
import type { Job, MutasiKind } from '@/types/Public/Welding/planning'

/** Tandai jenis baris (FP/WIP) pada job hasil API. Part yang sama bisa muncul di FP & WIP. */
export function tagKind<T extends Job | null | undefined>(job: T, kind: MutasiKind): T {
    if (job) job.kind = kind
    return job
}
export function tagKinds(jobs: Job[] | null | undefined, kind: MutasiKind): Job[] {
    const list = jobs ?? []
    for (const j of list) j.kind = kind
    return list
}

const natural = (a: string, b: string) =>
    a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })

// Abjad mesin (natural, mesin kosong paling bawah), mesin sama → abjad part number.
// Selaras welding_machine_part_cmp() di backend (urutan Mutasi FP & LKH).
function compareMachinePart(a: Job, b: Job): number {
    const ma = (a.sortMachine ?? a.machine ?? '').trim()
    const mb = (b.sortMachine ?? b.machine ?? '').trim()
    const ea = ma === '' || ma === '0', eb = mb === '' || mb === '0'
    if (ea !== eb) return ea ? 1 : -1
    return natural(ma, mb) || natural(a.partNo, b.partNo)
}

/**
 * Gabung FP + WIP jadi satu urutan mesin → part. Urutan FP dari backend
 * dipertahankan apa adanya (sama persis dengan LKH); WIP diurut lalu disisipkan
 * (merge stabil — seri: FP dulu).
 */
export function mergeMutasiRows(fp: Job[], wip: Job[]): Job[] {
    const w = [...wip].sort(compareMachinePart)
    const out: Job[] = []
    let i = 0, k = 0
    while (i < fp.length && k < w.length) {
        out.push(compareMachinePart(w[k], fp[i]) < 0 ? w[k++] : fp[i++])
    }
    while (i < fp.length) out.push(fp[i++])
    while (k < w.length) out.push(w[k++])
    return out
}

// Baris yang menentukan "ada kegiatan" — STOCK/BALANCE/STRENGTH/PCS_PER_DAY tidak dihitung.
const ACTIVITY_TYPES = new Set(['FORECAST', 'DELIVERY', 'PLAN', 'ACTUAL'])

/**
 * Part "kosong" sebulan ini: tanpa MDFO / Σ parent (WIP), DN, plan, maupun actual —
 * paling banter hanya ada stok. Dipakai saklar "Sembunyikan part kosong".
 */
export function isIdleJob(job: Job): boolean {
    for (const d of job.descriptions ?? []) {
        if (!ACTIVITY_TYPES.has(d.type)) continue
        for (const cell of Object.values(d.dates ?? {})) {
            if (Number(cell?.day) || Number(cell?.night)) return false
        }
    }
    return true
}