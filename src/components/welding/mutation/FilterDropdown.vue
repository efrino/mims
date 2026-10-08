<!-- components/welding/mutation/FilterDropdown.vue -->
<template>
    <!-- Overlay -->
    <div v-if="show" class="filter-overlay" @click="$emit('close')" />

    <!-- Dropdown -->
    <Teleport to="body">
        <Transition name="filter-fade">
            <div v-if="show" class="filter-dropdown" :style="position" @click.stop @mousedown.stop>
                <!-- Header -->
                <div class="filter-header">
                    <span class="filter-header-title">{{ title }}</span>
                    <button class="filter-close-btn" @click="$emit('close')">
                        <i class="mdi mdi-close" />
                    </button>
                </div>

                <!-- Search box — hanya muncul jika searchable -->
                <div v-if="searchable" class="filter-search-wrap">
                    <div class="filter-search-inner">
                        <i class="mdi mdi-magnify filter-search-icon" />
                        <input
                            ref="searchInputRef"
                            :value="searchQuery"
                            type="text"
                            placeholder="Cari..."
                            class="filter-search-input"
                            @input="emitSearch"
                            @keydown.enter.prevent="$emit('apply')"
                            @keydown.esc.prevent="$emit('close')"
                        />
                        <button v-if="searchQuery" class="filter-search-clear" @mousedown.prevent @click.stop="$emit('search', '')">
                            <i class="mdi mdi-close-circle" />
                        </button>
                    </div>
                    <p v-if="searchQuery" class="filter-search-counter">
                        {{ options.length }} dari {{ totalOptions }} item
                    </p>
                </div>

                <!-- Body -->
                <div class="filter-body">

                    <!-- Select All -->
                    <div class="filter-item filter-item--all" @click="handleToggleAll">
                        <span class="cbox" :class="{
                            'cbox--checked':  allSelected,
                            'cbox--mixed':    someSelected && !allSelected,
                        }">
                            <i v-if="allSelected" class="mdi mdi-check cbox-icon" />
                            <span v-else-if="someSelected" class="cbox-dash" />
                        </span>
                        <span class="font-semibold">
                            {{ allSelected ? 'Deselect All' : 'Select All' }}
                            <span v-if="searchQuery" class="filter-search-label">(hasil pencarian)</span>
                        </span>
                    </div>

                    <div class="filter-divider" />

                    <!-- Loading -->
                    <div v-if="loading" class="filter-loading">
                        <i class="mdi mdi-loading mdi-spin filter-loading-icon" />
                        <span>Memuat data...</span>
                    </div>

                    <!-- Empty: no search results -->
                    <div v-else-if="options.length === 0 && searchQuery" class="filter-empty">
                        <i class="mdi mdi-magnify-close filter-empty-icon" />
                        <p>Tidak ada hasil untuk</p>
                        <p class="font-semibold">"{{ searchQuery }}"</p>
                    </div>

                    <!-- Empty: no data at all -->
                    <div v-else-if="options.length === 0" class="filter-empty">
                        <i class="mdi mdi-database-off-outline filter-empty-icon" />
                        <p>Tidak ada data</p>
                    </div>

                    <!-- Options -->
                    <template v-else>
                        <div
                            v-for="item in options"
                            :key="item.value"
                            class="filter-item"
                            :class="{ 'filter-item--active': item.selected }"
                            @click="toggleOption(item)"
                        >
                            <span class="cbox" :class="{ 'cbox--checked': item.selected }">
                                <i v-if="item.selected" class="mdi mdi-check cbox-icon" />
                            </span>
                            <span class="filter-item-label" v-html="highlight(item.label)" />
                        </div>
                    </template>
                </div>

                <!-- Gaya Excel "Add current selection to filter": saat search aktif & kolom ini
                     sudah punya filter, hasil search yg dicentang bisa DIGABUNG (bukan mengganti). -->
                <label v-if="searchQuery && activeCount > 0" class="filter-merge">
                    <input type="checkbox" :checked="mergeExisting" @change="$emit('toggleMerge', ($event.target as HTMLInputElement).checked)" />
                    Tambahkan ke filter yang ada ({{ activeCount }} nilai)
                </label>

                <!-- Footer -->
                <div class="filter-footer">
                    <button class="filter-reset-btn"  @click="$emit('reset')">Reset</button>
                    <button class="filter-invert-btn" @click="$emit('invert')">Invert</button>
                    <button class="apply-btn" :disabled="!allSelected && !someSelected" :title="!allSelected && !someSelected ? 'Centang minimal satu nilai' : ''" @click="$emit('apply')">Terapkan</button>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { FilterItem, FilterPosition } from '@/types/Public/Welding/planning'

interface Props {
    show:         boolean
    title:        string
    position:     FilterPosition
    options:      FilterItem[]   // visibleOptions (sudah difilter search)
    totalOptions?: number        // jumlah total sebelum filter search
    allSelected:  boolean
    someSelected: boolean
    searchable?:  boolean
    searchQuery?: string
    loading?:     boolean
    activeCount?: number         // jumlah nilai filter kolom ini yg sedang aktif
    mergeExisting?: boolean      // hasil search digabung ke filter aktif (bukan mengganti)
}

const props = withDefaults(defineProps<Props>(), {
    searchable:   false,
    searchQuery:  '',
    totalOptions: 0,
    loading:      false,
    activeCount:  0,
    mergeExisting: false,
})

const emit = defineEmits<{
    close:        []
    apply:        []
    reset:        []
    toggleAll:    [checked: boolean]
    toggleOption: [item: FilterItem]
    search:       [query: string]
    invert:       []
    toggleMerge:  [checked: boolean]
}>()

const searchInputRef = ref<HTMLInputElement | null>(null)

// Auto-focus search saat dropdown buka
watch(() => props.show, async (val) => {
    if (val && props.searchable) {
        await nextTick()
        searchInputRef.value?.focus()
    }
})

// Murni berbasis props — tidak baca e.target.checked (menghindari race condition)
const handleToggleAll = () => {
    // allSelected=true → deselect; otherwise → select all
    emit('toggleAll', !props.allSelected)
}

const emitSearch = (e: Event) => {
    emit('search', (e.target as HTMLInputElement).value)
}

// Dipanggil dari klik row — tidak ada native checkbox toggle
const toggleOption = (item: FilterItem) => {
    emit('toggleOption', item)
}

// Highlight teks yang match query search
const highlight = (text: string): string => {
    const q = props.searchQuery?.trim()
    if (!q) return escapeHtml(text)
    const escaped  = escapeHtml(text)
    const escapedQ = escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return escaped.replace(
        new RegExp(`(${escapedQ})`, 'gi'),
        '<mark class="filter-highlight">$1</mark>'
    )
}

const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
</script>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────── */
.filter-overlay {
    position: fixed;
    inset: 0;
    z-index: 99998;
}

/* ── Dropdown ────────────────────────────────────────────── */
.filter-dropdown {
    position: fixed;
    z-index: 99999;
    background: var(--dm-surface, white);
    border: 1px solid #4472C4;
    border-radius: 6px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08);
    min-width: 250px;
    max-width: 320px;
    display: flex;
    flex-direction: column;
    max-height: 440px;
}

/* ── Header ──────────────────────────────────────────────── */
.filter-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--dm-surface2, #F8F9FA);
    border-bottom: 1px solid var(--dm-border, #E0E0E0);
    border-radius: 6px 6px 0 0;
    flex-shrink: 0;
}

.filter-header-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--dm-text, #1F2937);
}

.filter-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--dm-faint, #9CA3AF);
    transition: color 0.15s;
    padding: 2px;
    border-radius: 3px;
}
.filter-close-btn:hover { color: var(--dm-cell, #374151); }

/* ── Search ──────────────────────────────────────────────── */
.filter-search-wrap {
    padding: 8px 12px;
    border-bottom: 1px solid var(--dm-border, #E0E0E0);
    flex-shrink: 0;
}

.filter-search-inner {
    position: relative;
    display: flex;
    align-items: center;
}

.filter-search-icon {
    position: absolute;
    left: 8px;
    color: var(--dm-faint, #9CA3AF);
    font-size: 14px;
    pointer-events: none;
}

.filter-search-input {
    width: 100%;
    padding: 5px 28px 5px 26px;
    font-size: 11px;
    border: 1px solid var(--dm-border, #D1D5DB);
    border-radius: 4px;
    outline: none;
    color: var(--dm-cell, #374151);
    background: var(--dm-bg, #fff);
    transition: border-color 0.15s, box-shadow 0.15s;
}
.filter-search-input::placeholder { color: var(--dm-faint, #D1D5DB); }
.filter-search-input:focus {
    border-color: #4472C4;
    box-shadow: 0 0 0 2px rgba(68, 114, 196, 0.15);
}

.filter-search-clear {
    position: absolute;
    right: 7px;
    color: var(--dm-faint, #9CA3AF);
    font-size: 13px;
    line-height: 1;
    transition: color 0.15s;
}
.filter-search-clear:hover { color: #EF4444; }

.filter-search-counter {
    margin-top: 4px;
    font-size: 10px;
    color: var(--dm-faint, #9CA3AF);
}

.filter-search-label {
    font-size: 10px;
    font-weight: normal;
    color: var(--dm-faint, #9CA3AF);
}

/* ── Body ────────────────────────────────────────────────── */
.filter-body {
    overflow-y: auto;
    padding: 4px 0;
    flex: 1;
    min-height: 0;
}

.filter-divider {
    height: 1px;
    background: var(--dm-border, #E0E0E0);
    margin: 2px 0;
}

/* ── Custom Checkbox ─────────────────────────────────────── */
.cbox {
    width: 14px;
    height: 14px;
    min-width: 14px;
    border: 1.5px solid var(--dm-bd-blue, #C4C9D4);
    border-radius: 3px;
    background: var(--dm-surface, white);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s, border-color 0.1s;
    flex-shrink: 0;
}

.cbox--checked {
    background: #4472C4;
    border-color: #4472C4;
}

.cbox--mixed {
    background: #4472C4;
    border-color: #4472C4;
}

.cbox-icon {
    font-size: 10px;
    color: white;
    line-height: 1;
    display: block;
}

.cbox-dash {
    width: 8px;
    height: 2px;
    background: var(--dm-surface, white);
    border-radius: 1px;
    display: block;
}

/* ── Filter Item ─────────────────────────────────────────── */
.filter-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 11px;
    color: var(--dm-cell, #374151);
    transition: background 0.08s;
    user-select: none;
}

.filter-item:hover {
    background: var(--dm-tint-blue, #EEF2FF);
}

.filter-item:hover .cbox:not(.cbox--checked):not(.cbox--mixed) {
    border-color: #4472C4;
}

.filter-item--all {
    color: var(--dm-text, #1F2937);
}

.filter-item--active {
    background: var(--dm-tint-blue, #F0F4FF);
}

.filter-item-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ── Loading state ───────────────────────────────────────── */
.filter-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px 12px;
    font-size: 11px;
    color: var(--dm-muted, #6B7280);
}

.filter-loading-icon {
    font-size: 18px;
    color: var(--dm-accent, #4472C4);
}

/* ── Empty state ─────────────────────────────────────────── */
.filter-empty {
    padding: 20px 12px;
    text-align: center;
    font-size: 11px;
    color: var(--dm-faint, #9CA3AF);
}

.filter-empty-icon {
    font-size: 28px;
    color: #E5E7EB;
    display: block;
    margin-bottom: 6px;
}

/* ── Footer ──────────────────────────────────────────────── */
.filter-merge {
    display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 11.5px; color: var(--dm-text-2, #475569);
    background: var(--dm-tint-amber, #fffbeb); border-top: 1px solid var(--dm-bd-amber, #fde68a); cursor: pointer;
}
.filter-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid var(--dm-border, #E0E0E0);
    background: var(--dm-surface2, #F8F9FA);
    border-radius: 0 0 6px 6px;
    flex-shrink: 0;
}

.filter-reset-btn {
    font-size: 11px;
    color: var(--dm-faint, #9CA3AF);
    padding: 2px 4px;
    border-radius: 3px;
    transition: color 0.15s;
}
.filter-reset-btn:hover { color: #EF4444; }

.filter-invert-btn {
    font-size: 11px;
    color: var(--dm-cell, #334155);
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid var(--dm-border-strong, #CBD5E1);
    background: var(--dm-surface, white);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
}
.filter-invert-btn:hover {
    border-color: #94A3B8;
    background: var(--dm-surface2, #F8FAFC);
}

.apply-btn {
    flex: 1;
    padding: 6px 12px;
    background: #4472C4;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: background 0.15s;
}
.apply-btn:hover:not(:disabled) { background: #2E5396; }
.apply-btn:disabled { background: var(--dm-border-strong, #CBD5E1); cursor: not-allowed; }

/* ── Transition ──────────────────────────────────────────── */
.filter-fade-enter-active,
.filter-fade-leave-active {
    transition: opacity 0.1s ease, transform 0.1s ease;
}
.filter-fade-enter-from,
.filter-fade-leave-to {
    opacity: 0;
    transform: scale(0.97) translateY(-4px);
}
</style>

<!-- Highlight style (tidak scoped — di-render via v-html) -->
<style>
.filter-highlight {
    background-color: #FEF08A;
    color: var(--dm-on-amber, #713F12);
    border-radius: 2px;
    padding: 0 2px;
}
</style>
