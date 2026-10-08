// composables/useAreaColor.ts
// Palet warna standar area — sama di seluruh aplikasi.
//
// Aturan (2026-09-30): WARNA = TIPE AREA, SHADE = PLANT.
//   WSS = biru   ·  CO (CO2 robot) = oranye  ·  SA (sub assy) = ungu
//   ADM = tua    ·  MMKI = sedang             ·  HMMI = muda
// Hijau / merah / abu SENGAJA tidak dipakai untuk area — itu warna STATUS
// (aktif / masalah / nonaktif), supaya warna area tidak pernah dibaca sebagai status.

export interface AreaColor {
    bg: string;       // background card / badge
    border: string;   // border / accent left
    text: string;     // text label
    pill: string;     // inline pill background
    pillText: string; // inline pill text
    gradient: string; // gradient untuk header card
}

export type AreaTypeKey = 'WSS' | 'CO' | 'SA';
export type AreaPlantKey = 'ADM' | 'MMKI' | 'HMMI';

/** [border/solid, text, pillText] per plant; bg & pill = tint keluarga warna. */
const FAMILY: Record<AreaTypeKey, { label: string; bg: string; pill: string; shades: Record<AreaPlantKey, [string, string, string]> }> = {
    WSS: {
        label: 'WSS', bg: '#eff6ff', pill: '#dbeafe',
        shades: { ADM: ['#1d4ed8', '#1e40af', '#1e3a8a'], MMKI: ['#2563eb', '#1d4ed8', '#1e40af'], HMMI: ['#3b82f6', '#2563eb', '#1d4ed8'] },
    },
    CO: {
        label: 'CO2 Robot', bg: '#fff7ed', pill: '#ffedd5',
        shades: { ADM: ['#c2410c', '#9a3412', '#7c2d12'], MMKI: ['#ea580c', '#c2410c', '#9a3412'], HMMI: ['#f97316', '#ea580c', '#c2410c'] },
    },
    SA: {
        label: 'Sub Assy', bg: '#f5f3ff', pill: '#ede9fe',
        shades: { ADM: ['#6d28d9', '#5b21b6', '#4c1d95'], MMKI: ['#7c3aed', '#6d28d9', '#5b21b6'], HMMI: ['#8b5cf6', '#7c3aed', '#6d28d9'] },
    },
};

function make(type: AreaTypeKey, plant: AreaPlantKey): AreaColor {
    const f = FAMILY[type];
    const [solid, text, pillText] = f.shades[plant];
    return { bg: f.bg, border: solid, text, pill: f.pill, pillText, gradient: `linear-gradient(135deg, ${text}, ${solid})` };
}

const AREA_PALETTE: Record<string, AreaColor> = {
    IFPP: {
        bg: '#f0fdfa', border: '#0f766e', text: '#115e59', pill: '#ccfbf1', pillText: '#134e4a',
        gradient: 'linear-gradient(135deg, #115e59, #0f766e)',
    },
};
for (const t of Object.keys(FAMILY) as AreaTypeKey[])
    for (const p of ['ADM', 'MMKI', 'HMMI'] as AreaPlantKey[]) AREA_PALETTE[`${t} ${p}`] = make(t, p);

/** Legenda tipe area (warna keluarga, shade tengah). */
export const AREA_TYPE_LEGEND = (Object.keys(FAMILY) as AreaTypeKey[]).map(t => ({
    type: t, label: FAMILY[t].label, color: FAMILY[t].shades.MMKI[0],
}));

const FALLBACK: AreaColor = {
    bg: '#f8fafc',
    border: '#64748b',
    text: '#475569',
    pill: '#f1f5f9',
    pillText: '#334155',
    gradient: 'linear-gradient(135deg, #475569, #64748b)',
};

export function useAreaColor() {
    function getColor(area: string): AreaColor {
        // Exact match dulu
        if (AREA_PALETTE[area]) return AREA_PALETTE[area];
        // Partial match (misal "SA ADM LINE 1")
        for (const key of Object.keys(AREA_PALETTE)) {
            if (area.includes(key) || key.includes(area)) return AREA_PALETTE[key];
        }
        return FALLBACK;
    }

    function getStyle(area: string): Record<string, string> {
        const c = getColor(area);
        return {
            '--area-bg': c.bg,
            '--area-border': c.border,
            '--area-text': c.text,
            '--area-pill': c.pill,
            '--area-pill-text': c.pillText,
        };
    }

    return { getColor, getStyle, AREA_PALETTE };
}
