// services/Public/Welding/achievementSourceService.ts
// Kontrol isolasi per-area sumber achievement (v1 welding_achievement /
// v2 welding_achievement_v2 / both). Lihat plan-monitor.vue & CLAUDE.md.

import axios from 'axios'

const BASE_URL = 'http://192.168.10.67/majsf_rest_api/api/welding_achievement_source'

export type AchievementSource = 'v1' | 'v2' | 'both'

export interface AchievementSourceRow {
  area_code: string
  source: AchievementSource
  updated_by: string | null
  updated_at: string | null
}

const achievementSourceService = {
  async getList(): Promise<AchievementSourceRow[]> {
    const res = await axios.get(`${BASE_URL}/list`)
    return res.data?.data ?? []
  },

  async save(area_code: string, source: AchievementSource): Promise<boolean> {
    const res = await axios.post(`${BASE_URL}/save`, { area_code, source })
    return res.data?.status === 'success'
  },

  // Saklar GLOBAL: default utk area tanpa override (planning_config.achievement_source_default).
  async getDefault(): Promise<AchievementSource> {
    const res = await axios.get(`${BASE_URL}/default`)
    return (res.data?.source ?? 'both') as AchievementSource
  },

  async setDefault(source: AchievementSource): Promise<{ ok: boolean; message?: string }> {
    const res = await axios.post(`${BASE_URL}/set_default`, { source })
    return { ok: res.data?.status === 'success', message: res.data?.message }
  },

  // Terapkan ke SEMUA area FP aktif (upsert per-area) + set default global.
  async applyAll(source: AchievementSource): Promise<{ ok: boolean; message?: string; areas?: string[] }> {
    const res = await axios.post(`${BASE_URL}/apply_all`, { source })
    return { ok: res.data?.status === 'success', message: res.data?.message, areas: res.data?.areas }
  },
}

export default achievementSourceService
