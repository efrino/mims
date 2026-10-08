<template>
    <div class="page">

        <!-- HEADER -->
        <div class="page-header">
            <div class="header-left">
                <span class="page-icon"><i class="ti ti-chart-dots"></i></span>
                <div>
                    <h1 class="page-title">Welding auto-plan</h1>
                    <p class="page-sub">Pipeline visualisasi — {{ spmonLabel }}</p>
                </div>
            </div>
            <div class="header-right">
                <select v-model="selectedSpmon" class="spmon-select" :disabled="isRunning">
                    <option v-for="opt in spmonOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <select v-model="selectedArea" class="spmon-select area-select" :disabled="isRunning">
                    <option value="">Semua area</option>
                    <option v-for="a in dynamicAreas" :key="a" :value="a">{{ a }}</option>
                </select>
                <span class="status-badge" :class="statusClass">{{ statusLabel }}</span>
                <button class="btn-run" :disabled="isRunning || clampRunning" @click="runPipeline">
                    <i class="ti ti-player-play"></i>
                    {{ isRunning ? 'Running...' : 'Run pipeline' }}
                </button>
                <button
                    v-if="tableRows.length && !isRunning"
                    class="btn-clamp"
                    :disabled="clampRunning"
                    @click="runClamp"
                    title="Hitung ulang rencana produksi tanpa re-run full pipeline"
                >
                    <i class="ti ti-bolt"></i>
                    {{ clampRunning ? 'CLAMP...' : 'Re-run SMART CLAMP' }}
                </button>

            </div>
        </div>

        <!-- METRICS -->
        <div class="metrics-row">
            <div class="metric-card">
                <div class="metric-label">Total area</div>
                <div class="metric-value">{{ metrics.totalArea ?? '—' }}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">FP diproses</div>
                <div class="metric-value accent-teal">{{ metrics.fp ?? '—' }}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Cocok MDFO</div>
                <div class="metric-value accent-green">{{ metrics.matched ?? '—' }}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Ada DN</div>
                <div class="metric-value accent-blue">{{ metrics.dnFound ?? '—' }}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Ada aktual</div>
                <div class="metric-value accent-purple">{{ metrics.actFound ?? '—' }}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Plan dibuat</div>
                <div class="metric-value accent-clamp">{{ metrics.planFound ?? '—' }}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Elapsed</div>
                <div class="metric-value">{{ elapsedLabel }}</div>
            </div>
        </div>

        <!-- STAGES GRID (7 pipeline stages) -->
        <div class="steps-grid">

            <!-- Stage 1: Persiapan Daftar Part -->
            <div class="step-card" :class="getStepCardClass(step1.state)">
                <div class="step-header">
                    <div class="step-num" :class="getStepNumClass(step1.state)">1</div>
                    <div class="step-info">
                        <span class="step-title">Persiapan Daftar Part</span>
                        <span class="step-desc">Menyemai semua kombinasi part × hari ke tabel kerja bulanan, lengkap dengan stok awal dari gudang</span>
                    </div>
                    <div class="step-header-right">
                        <span v-if="stageSubStep[1] && step1.state === 'active'" class="substep-chip">
                            {{ stageSubStep[1].current }}/{{ stageSubStep[1].total }}
                        </span>
                        <span class="step-stat" :class="getStepStatClass(step1.state)">{{ getStepLabel(step1.state) }}</span>
                    </div>
                </div>
                <div v-if="step1.visible" class="step-body">
                    <div class="progress-wrap"><div class="progress-fill" :style="{ width: step1.pct + '%' }"></div></div>
                    <div class="area-chips">
                        <span v-for="a in dynamicAreas" :key="a" class="area-chip"
                            :class="step1.state === 'done' ? 'chip-done' : (step1.state === 'active' ? 'chip-active' : '')">
                            <i v-if="step1.state === 'done'" class="ti ti-check" style="font-size:10px"></i>
                            <i v-else-if="step1.state === 'active'" class="ti ti-loader-2" style="font-size:10px"></i>
                            {{ a }}
                        </span>
                    </div>
                    <div class="log-list" ref="log1Ref">
                        <div v-for="(l, i) in step1.logs" :key="i" class="log-item" :class="l.type">
                            <span class="log-dot"></span><span class="log-text">{{ l.msg }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stage 2: Data Permintaan Pelanggan (MDFO + DN + Anomali) -->
            <div class="step-card" :class="getStepCardClass(step2.state)">
                <div class="step-header">
                    <div class="step-num" :class="getStepNumClass(step2.state)">2</div>
                    <div class="step-info">
                        <span class="step-title">Data Permintaan Pelanggan</span>
                        <span class="step-desc">MDFO (forecast minimum) + DN (order konfirmasi shift pagi/malam) + deteksi anomali data permintaan</span>
                    </div>
                    <div class="step-header-right">
                        <span v-if="stageSubStep[2] && step2.state === 'active'" class="substep-chip">
                            {{ stageSubStep[2].current }}/{{ stageSubStep[2].total }}
                        </span>
                        <span class="step-stat" :class="getStepStatClass(step2.state)">{{ getStepLabel(step2.state) }}</span>
                    </div>
                </div>
                <div v-if="step2.visible" class="step-body">
                    <div class="progress-wrap"><div class="progress-fill" :style="{ width: step2.pct + '%' }"></div></div>
                    <div class="step2-counters">
                        <span class="counter match"><i class="ti ti-chart-bar"></i>
                            {{ metrics.matched != null ? metrics.matched : '—' }} cocok MDFO
                        </span>
                        <span class="counter" style="color:#1D4ED8"><i class="ti ti-truck-delivery"></i>
                            {{ metrics.dnFound != null ? metrics.dnFound : '—' }} ada DN
                        </span>
                    </div>
                    <div class="log-list" ref="log2Ref">
                        <div v-for="(l, i) in step2.logs" :key="i" class="log-item" :class="l.type">
                            <span class="log-dot"></span><span class="log-text">{{ l.msg }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stage 3: Jadwal Kerja & Hari Libur -->
            <div class="step-card" :class="getStepCardClass(step3.state)">
                <div class="step-header">
                    <div class="step-num" :class="getStepNumClass(step3.state)">3</div>
                    <div class="step-info">
                        <span class="step-title">Jadwal Kerja &amp; Hari Libur</span>
                        <span class="step-desc">Membaca kalender LKH per pelanggan — setiap pelanggan punya jadwal berbeda, rencana produksi wajib menyesuaikan</span>
                    </div>
                    <div class="step-header-right">
                        <span v-if="stageSubStep[3] && step3.state === 'active'" class="substep-chip">
                            {{ stageSubStep[3].current }}/{{ stageSubStep[3].total }}
                        </span>
                        <span class="step-stat" :class="getStepStatClass(step3.state)">{{ getStepLabel(step3.state) }}</span>
                    </div>
                </div>
                <div v-if="step3.visible" class="step-body">
                    <div class="progress-wrap"><div class="progress-fill" :style="{ width: step3.pct + '%' }"></div></div>
                    <div class="step2-counters">
                        <span class="counter match"><i class="ti ti-calendar-check"></i>
                            {{ metrics.wdFound != null ? metrics.wdFound : '—' }} hari kerja OK
                        </span>
                    </div>
                    <div class="log-list" ref="log3Ref">
                        <div v-for="(l, i) in step3.logs" :key="i" class="log-item" :class="l.type">
                            <span class="log-dot"></span><span class="log-text">{{ l.msg }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stage 4: Data Produksi Aktual + pcs/day -->
            <div class="step-card" :class="getStepCardClass(step4.state)">
                <div class="step-header">
                    <div class="step-num" :class="getStepNumClass(step4.state)">4</div>
                    <div class="step-info">
                        <span class="step-title">Data Produksi Aktual</span>
                        <span class="step-desc">Membaca hasil produksi nyata dari lantai pabrik untuk proyeksi stok akurat, sekaligus menghitung pcs/day rata-rata per part</span>
                    </div>
                    <div class="step-header-right">
                        <span v-if="stageSubStep[4] && step4.state === 'active'" class="substep-chip">
                            {{ stageSubStep[4].current }}/{{ stageSubStep[4].total }}
                        </span>
                        <span class="step-stat" :class="getStepStatClass(step4.state)">{{ getStepLabel(step4.state) }}</span>
                    </div>
                </div>
                <div v-if="step4.visible" class="step-body">
                    <div class="progress-wrap"><div class="progress-fill" :style="{ width: step4.pct + '%' }"></div></div>
                    <div class="step2-counters">
                        <span class="counter match"><i class="ti ti-chart-bar"></i>
                            {{ metrics.actFound != null ? metrics.actFound : '—' }} ada aktual
                        </span>
                        <span class="counter nodata"><i class="ti ti-minus"></i>
                            {{ metrics.actNotFound != null ? metrics.actNotFound : '—' }} belum ada
                        </span>
                    </div>
                    <div class="log-list" ref="log4Ref">
                        <div v-for="(l, i) in step4.logs" :key="i" class="log-item" :class="l.type">
                            <span class="log-dot"></span><span class="log-text">{{ l.msg }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stage 5: Analisis Stok & Prioritas — full width -->
            <div class="step-card step-wide" :class="getStepCardClass(step5.state)">
                <div class="step-header">
                    <div class="step-num" :class="getStepNumClass(step5.state)">5</div>
                    <div class="step-info">
                        <span class="step-title">Analisis Stok &amp; Prioritas</span>
                        <span class="step-desc">Menghitung rolling stok, merangking part berdasarkan kegentingan (critical/deficit), proyeksi demand jangka panjang, dan menentukan titik cutoff produksi</span>
                    </div>
                    <div class="step-header-right">
                        <span v-if="stageSubStep[5] && step5.state === 'active'" class="substep-chip">
                            {{ stageSubStep[5].current }}/{{ stageSubStep[5].total }}
                        </span>
                        <span class="step-stat" :class="getStepStatClass(step5.state)">{{ getStepLabel(step5.state) }}</span>
                    </div>
                </div>
                <div v-if="step5.visible" class="step-body step5-body">
                    <div class="step5-left">
                        <div class="progress-wrap"><div class="progress-fill" :style="{ width: step5.pct + '%' }"></div></div>
                        <div class="step2-counters" style="flex-direction:column;gap:6px">
                            <span class="counter match"><i class="ti ti-list-numbers"></i>
                                {{ stageLastRows[5] ?? '—' }} baris diproses
                            </span>
                            <span class="counter nodata" v-if="stageLastDetail[5]" style="font-size:10.5px">
                                {{ stageLastDetail[5] }}
                            </span>
                        </div>
                    </div>
                    <div class="step5-right">
                        <div class="log-list" ref="log5Ref">
                            <div v-for="(l, i) in step5.logs" :key="i" class="log-item" :class="l.type">
                                <span class="log-dot"></span><span class="log-text">{{ l.msg }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stage 6: Rencana Produksi — SMART CLAMP, full width -->
            <div class="step-card step-wide step-clamp" :class="getStepCardClass(step6.state)">
                <div class="step-header">
                    <div class="step-num step-num-clamp" :class="getStepNumClass(step6.state)">6</div>
                    <div class="step-info">
                        <span class="step-title">Rencana Produksi — SMART CLAMP</span>
                        <span class="step-desc">
                            Menghitung berapa unit harus diproduksi tiap shift &amp; tiap hari —
                            mempertimbangkan stok, kapasitas mesin, lot size kanban, jadwal weekend recovery, dan proyeksi kebutuhan pelanggan
                        </span>
                    </div>
                    <div class="step-header-right">
                        <span v-if="stageSubStep[6] && step6.state === 'active'" class="substep-chip substep-chip-clamp">
                            {{ stageSubStep[6].current }}/{{ stageSubStep[6].total }}
                        </span>
                        <span class="step-stat" :class="getStepStatClass(step6.state)">{{ getStepLabel(step6.state) }}</span>
                    </div>
                </div>
                <div v-if="step6.visible" class="step-body step5-body">
                    <div class="step5-left">
                        <div class="progress-wrap">
                            <div class="progress-fill progress-fill-clamp" :style="{ width: step6.pct + '%' }"></div>
                        </div>
                        <div class="step2-counters">
                            <span class="counter clamp-ok"><i class="ti ti-bolt"></i>
                                {{ metrics.planFound != null ? metrics.planFound : '—' }} ada plan
                            </span>
                        </div>
                        <div class="clamp-legend">
                            <div class="clamp-legend-item">
                                <span class="clamp-dot clamp-dot-crit"></span><span>Kritis &lt;12h → PJK</span>
                            </div>
                            <div class="clamp-legend-item">
                                <span class="clamp-dot clamp-dot-safe"></span><span>Aman 12–20h</span>
                            </div>
                            <div class="clamp-legend-item">
                                <span class="clamp-dot clamp-dot-over"></span><span>Over &gt;20h → skip</span>
                            </div>
                        </div>
                    </div>
                    <div class="step5-right">
                        <div class="log-list" ref="log6Ref">
                            <div v-for="(l, i) in step6.logs" :key="i" class="log-item" :class="l.type">
                                <span class="log-dot"></span><span class="log-text">{{ l.msg }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stage 7: Validasi & Peringatan, full width -->
            <div class="step-card step-wide step-validate" :class="getStepCardClass(step7.state)">
                <div class="step-header">
                    <div class="step-num step-num-validate" :class="getStepNumClass(step7.state)">7</div>
                    <div class="step-info">
                        <span class="step-title">Validasi &amp; Peringatan</span>
                        <span class="step-desc">
                            Memeriksa kondisi kritis: part tanpa forecast, pola produksi hilang, dan anomali stok — menghasilkan alert untuk tindakan segera
                        </span>
                    </div>
                    <div class="step-header-right">
                        <span v-if="stageSubStep[7] && step7.state === 'active'" class="substep-chip substep-chip-validate">
                            {{ stageSubStep[7].current }}/{{ stageSubStep[7].total }}
                        </span>
                        <span class="step-stat" :class="getStepStatClass(step7.state)">{{ getStepLabel(step7.state) }}</span>
                    </div>
                </div>
                <div v-if="step7.visible" class="step-body step5-body">
                    <div class="step5-left">
                        <div class="progress-wrap">
                            <div class="progress-fill progress-fill-validate" :style="{ width: step7.pct + '%' }"></div>
                        </div>
                        <div class="step2-counters">
                            <span class="counter validate-ok" v-if="step7Warnings.length === 0 && step7.state === 'done'">
                                <i class="ti ti-shield-check"></i> Pipeline berjalan normal
                            </span>
                            <span class="counter validate-warn" v-if="step7Warnings.length > 0">
                                <i class="ti ti-alert-triangle"></i> {{ step7Warnings.length }} kondisi perlu perhatian
                            </span>
                        </div>
                        <div class="validate-alerts" v-if="step7Warnings.length > 0">
                            <div v-for="(w, i) in step7Warnings" :key="i" class="validate-alert-item">
                                <span class="validate-badge">{{ w.count }}</span>
                                <span class="validate-msg">{{ w.message }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="step5-right">
                        <div class="log-list" ref="log7Ref">
                            <div v-for="(l, i) in step7.logs" :key="i" class="log-item" :class="l.type">
                                <span class="log-dot"></span><span class="log-text">{{ l.msg }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- PIPELINE SUMMARY -->
        <div v-if="pipelineSummary.pipeline_status" class="summary-wrap">
            <div class="summary-header">
                <div>
                    <div class="summary-title">Ringkasan Hasil Pipeline</div>
                    <div class="summary-sub">Hasil akhir proses perencanaan produksi welding bulan ini</div>
                </div>
                <div class="summary-header-right">
                    <span class="summary-status" :class="pipelineSummary.pipeline_status === 'VALID' ? 'summary-valid' : 'summary-invalid'">
                        {{ pipelineSummary.pipeline_status }}
                    </span>
                    <router-link :to="mutasiRoute" class="btn-mutasi" target="_blank" title="Buka tabel mutasi harian untuk area ini">
                        <i class="ti ti-table"></i>
                        Tabel Mutasi
                        <span class="mutasi-area-chip">{{ selectedArea || 'SA ADM' }}</span>
                        <i class="ti ti-external-link" style="font-size:11px;opacity:0.7"></i>
                    </router-link>
                </div>
            </div>
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="summary-label">SPMON</span>
                    <span class="summary-value">{{ pipelineSummary.spmon }}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Total part diproses</span>
                    <span class="summary-value">{{ pipelineSummary.total_stage }}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Ada data forecast</span>
                    <span class="summary-value success">{{ pipelineSummary.mdfo_matched }}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Tanpa data forecast</span>
                    <span class="summary-value warn">{{ pipelineSummary.mdfo_no_match }}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Ada order konfirmasi (DN)</span>
                    <span class="summary-value info">{{ pipelineSummary.dn_found }}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Tanpa DN bulan ini</span>
                    <span class="summary-value muted">{{ pipelineSummary.dn_not_found }}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Kalender hari kerja OK</span>
                    <span class="summary-value success">{{ pipelineSummary.wd_found }}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Kalender tidak ditemukan</span>
                    <span class="summary-value muted">{{ pipelineSummary.wd_not_found }}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Ada hasil produksi nyata</span>
                    <span class="summary-value accent-purple-val">{{ pipelineSummary.act_found }}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Belum ada data aktual</span>
                    <span class="summary-value muted">{{ pipelineSummary.act_not_found }}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Eligible SMART CLAMP</span>
                    <span class="summary-value" title="Part FP dengan op — yang masuk ke perhitungan rencana produksi">{{ pipelineSummary.plan_eligible ?? '—' }}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Rencana produksi dibuat</span>
                    <span class="summary-value accent-clamp-val">{{ pipelineSummary.plan_found }}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Stok aman — tidak perlu produksi</span>
                    <span class="summary-value muted">{{ pipelineSummary.plan_not_found }}</span>
                </div>
            </div>
            <div v-if="pipelineSummary.notes?.length" class="summary-notes">
                <div v-for="(n, i) in pipelineSummary.notes" :key="i" class="summary-note">
                    <i class="ti ti-info-circle"></i> {{ n }}
                </div>
            </div>
        </div>

        <!-- RESULT SECTION -->
        <div v-if="tableRows.length" class="result-section">

            <!-- toolbar -->
            <div class="result-toolbar">
                <div class="result-toolbar-left">
                    <button class="tab-btn" :class="{ 'tab-active': activeTab === 'summary' }" @click="switchTab('summary')">
                        <i class="ti ti-list-details"></i> Ringkasan
                    </button>
                    <button class="tab-btn" :class="{ 'tab-active': activeTab === 'mutasi' }" @click="switchTab('mutasi')">
                        <i class="ti ti-calendar-stats"></i> Mutasi Harian
                    </button>
                    <button class="tab-btn" :class="{ 'tab-active': activeTab === 'unregistered' }" @click="switchTab('unregistered')">
                        <i class="ti ti-alert-triangle"></i> Belum Terdaftar
                        <span v-if="enrichedMissingParts.length" class="tab-badge">{{ enrichedMissingParts.length }}</span>
                    </button>
                    <span v-if="activeTab !== 'unregistered'" class="result-count">{{ filteredRows.length }} part</span>
                    <span class="result-spmon">{{ spmonLabel }}</span>
                </div>
                <div class="result-toolbar-right">
                    <!-- WD legend — tampil saat tab mutasi aktif -->
                    <div v-if="activeTab === 'mutasi'" class="wd-legend">
                        <span class="wd-legend-item wd-full"><span class="wd-dot"></span>Kerja</span>
                        <span class="wd-legend-item wd-half-legend"><span class="wd-dot"></span>½ hari</span>
                        <span class="wd-legend-item wd-off-legend"><span class="wd-dot"></span>Libur</span>
                        <span class="wd-legend-item wd-warn-legend"><span class="wd-dot"></span>Order di hari libur</span>
                    </div>
                    <template v-if="activeTab !== 'unregistered'">
                        <select v-model="filterArea" class="filter-select" @change="currentPage = 1">
                            <option value="">Semua area</option>
                            <option v-for="a in dynamicAreas" :key="a" :value="a">{{ a }}</option>
                        </select>
                        <select v-model="filterMatch" class="filter-select" @change="currentPage = 1">
                            <option value="">Semua status</option>
                            <option value="match">MDFO Match</option>
                            <option value="nomatch">MDFO No match</option>
                            <option value="nodn">Tidak ada DN</option>
                        </select>
                    </template>
                </div>
            </div>

            <!-- ── TAB: RINGKASAN ── -->
            <div v-if="activeTab === 'summary'">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th style="width:36px">#</th>
                            <th style="width:17%;text-align:left">Part number</th>
                            <th style="width:8%">Area</th>
                            <th style="width:7%">Model</th>
                            <th style="width:9%;text-align:right">pcs/day</th>
                            <th style="width:10%;text-align:right">pcs/bln MDFO</th>
                            <th style="width:9%;text-align:right">Total DN</th>
                            <th style="width:8%;text-align:right">Stok</th>
                            <th style="width:9%">KUNNR</th>
                            <th style="width:8%;text-align:right">WD Day</th>
                            <th style="width:8%;text-align:right">WD Night</th>
                            <th style="width:7%">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(r, i) in paginatedRows" :key="i" class="summary-row">
                            <td class="s-center s-muted">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
                            <td class="s-mono">{{ r.part_number }}</td>
                            <td class="s-center"><span class="area-inline">{{ r.area }}</span></td>
                            <td class="s-center">{{ r.model ?? '—' }}</td>
                            <td class="s-right">{{ r.pcs_day != null ? Number(r.pcs_day).toLocaleString() : '—' }}</td>
                            <td class="s-right">{{ r.pcs_month ? r.pcs_month.toLocaleString() : '—' }}</td>
                            <td class="s-right">
                                <span v-if="r.dn_total > 0" class="dn-qty">{{ r.dn_total.toLocaleString() }}</span>
                                <span v-else class="s-muted">—</span>
                            </td>
                            <td class="s-right">
                                <span v-if="r.labst != null" class="labst-val" :class="r.labst === 0 ? 'labst-zero' : ''">{{ r.labst.toLocaleString() }}</span>
                                <span v-else class="s-muted">—</span>
                            </td>
                            <td class="s-center">
                                <span v-if="r.kunnr" class="kunnr-tag">{{ r.kunnr }}</span>
                                <span v-else class="s-muted">—</span>
                            </td>
                            <td class="s-right">
                                <span v-if="r.wd_day_total > 0" class="wd-total-day">{{ r.wd_day_total }}</span>
                                <span v-else class="s-muted">—</span>
                            </td>
                            <td class="s-right">
                                <span v-if="r.wd_night_total > 0" class="wd-total-night">{{ r.wd_night_total }}</span>
                                <span v-else class="s-muted">—</span>
                            </td>
                            <td class="s-center">
                                <span class="tag" :class="r.matched ? 'tag-match' : 'tag-skip'">
                                    {{ r.matched ? 'Match' : 'No match' }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- pagination -->
                <div v-if="totalPages > 1" class="pagination">
                    <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">
                        <i class="ti ti-chevron-left"></i>
                    </button>
                    <template v-for="p in pageNumbers" :key="p">
                        <span v-if="p === '...'" class="page-ellipsis">…</span>
                        <button v-else class="page-btn" :class="{ 'page-active': p === currentPage }" @click="currentPage = p as number">{{ p }}</button>
                    </template>
                    <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">
                        <i class="ti ti-chevron-right"></i>
                    </button>
                    <span class="page-info">{{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, filteredRows.length) }} dari {{ filteredRows.length }}</span>
                </div>
            </div>

            <!-- ── TAB: MUTASI HARIAN ── -->
            <div v-if="activeTab === 'mutasi'" class="mutasi-scroll">
                <table class="plan-table">
                    <thead>
                        <!-- Baris 1: frozen info (rowspan=2) + nomor hari (colspan=2 per hari) -->
                        <tr>
                            <th rowspan="2" class="pt-th pt-frozen" style="width:30px;left:0">#</th>
                            <th rowspan="2" class="pt-th pt-frozen" style="width:76px;left:30px;text-align:left;padding-left:6px">JOB NO</th>
                            <th rowspan="2" class="pt-th pt-frozen" style="width:140px;left:106px;text-align:left;padding-left:8px">PART NO</th>
                            <th rowspan="2" class="pt-th pt-frozen" style="width:56px;left:246px">MODEL</th>
                            <th rowspan="2" class="pt-th pt-frozen" style="width:60px;left:302px;text-align:right;padding-right:6px">QTY KBN</th>
                            <th rowspan="2" class="pt-th pt-frozen" style="width:66px;left:362px;text-align:right;padding-right:6px">INIT.STK</th>
                            <th rowspan="2" class="pt-th pt-frozen pt-th-sep" style="width:90px;left:428px;text-align:left;padding-left:6px">DESC</th>
                            <th
                                v-for="day in daysInMonth"
                                :key="day"
                                colspan="2"
                                class="pt-th pt-day-th"
                                :class="{ 'pt-weekend-th': isDayWeekend(day), 'pt-today-th': isDayToday(day) }"
                            >
                                {{ day }}
                            </th>
                        </tr>
                        <!-- Baris 2: label D / N per hari -->
                        <tr>
                            <template v-for="day in daysInMonth" :key="day">
                                <th class="pt-sub-th" :class="{ 'pt-weekend-th': isDayWeekend(day), 'pt-today-th': isDayToday(day) }">D</th>
                                <th class="pt-sub-th" :class="{ 'pt-weekend-th': isDayWeekend(day), 'pt-today-th': isDayToday(day) }">N</th>
                            </template>
                        </tr>
                    </thead>
                    <tbody>
                        <template v-for="(r, rIdx) in paginatedRows" :key="rIdx">
                            <!-- 8 metric rows per part -->
                            <tr
                                v-for="(metric, mIdx) in PLAN_METRICS"
                                :key="mIdx"
                                class="pt-row"
                                :class="[
                                    'pm-' + metric.cssKey,
                                    { 'pt-row-first': mIdx === 0, 'pt-row-last': mIdx === PLAN_METRICS.length - 1 }
                                ]"
                            >
                                <!-- frozen info cells: hanya baris pertama tiap part (rowspan=8) -->
                                <template v-if="mIdx === 0">
                                    <td :rowspan="PLAN_METRICS.length" class="pt-td pt-frozen pt-center pt-info" style="width:30px;left:0">
                                        {{ (currentPage - 1) * pageSize + rIdx + 1 }}
                                    </td>
                                    <td :rowspan="PLAN_METRICS.length" class="pt-td pt-frozen pt-mono pt-info" style="width:76px;left:30px">
                                        {{ r.job_number ?? '—' }}
                                    </td>
                                    <td :rowspan="PLAN_METRICS.length" class="pt-td pt-frozen pt-mono pt-part pt-info" style="width:140px;left:106px">
                                        {{ r.part_number }}
                                    </td>
                                    <td :rowspan="PLAN_METRICS.length" class="pt-td pt-frozen pt-center pt-info" style="width:56px;left:246px">
                                        {{ r.model ?? '—' }}
                                    </td>
                                    <td :rowspan="PLAN_METRICS.length" class="pt-td pt-frozen pt-right pt-info" style="width:60px;left:302px">
                                        {{ r.qty_kbn?.toLocaleString() ?? '—' }}
                                    </td>
                                    <td
                                        :rowspan="PLAN_METRICS.length"
                                        class="pt-td pt-frozen pt-right pt-info pt-init-stock-cell"
                                        style="width:66px;left:362px"
                                        title="Double-click untuk edit stok awal bulan"
                                        @dblclick="startEditInitStock(r)"
                                    >
                                        <template v-if="editingInitStockKey === r.part_number_mix">
                                            <input
                                                ref="initStockInputRef"
                                                class="init-stock-input"
                                                type="number"
                                                :value="editInitStockVal"
                                                @input="editInitStockVal = Number(($event.target as HTMLInputElement).value)"
                                                @blur="saveInitStock(r)"
                                                @keydown.enter.prevent="saveInitStock(r)"
                                                @keydown.escape.prevent="cancelEditInitStock"
                                            />
                                        </template>
                                        <template v-else>
                                            <span
                                                v-if="(r.init_stock ?? r.labst) != null"
                                                class="labst-val"
                                                :class="(r.init_stock ?? r.labst) === 0 ? 'labst-zero' : ''"
                                            >
                                                {{ (r.init_stock ?? r.labst)!.toLocaleString() }}
                                            </span>
                                            <span v-else class="s-muted">—</span>
                                        </template>
                                    </td>
                                </template>

                                <!-- DESC cell: selalu ada, frozen, warna per metrik -->
                                <td class="pt-td pt-frozen pt-desc" :class="'pt-desc-' + metric.cssKey" style="width:90px;left:428px">
                                    {{ metric.label }}
                                </td>

                                <!-- Day cells: merged (MDFO & PCS/DAY) atau split D | N -->
                                <template v-for="day in daysInMonth" :key="day">
                                    <!-- Merged colspan=2 — MDFO & PCS/DAY -->
                                    <template v-if="isMergedMetric(metric.key)">
                                        <td
                                            colspan="2"
                                            class="pt-td pt-merged-cell"
                                            :class="{ 'pt-weekend-td': isDayWeekend(day), 'pt-today-td': isDayToday(day) }"
                                        >
                                            <span v-if="getPlanMergedVal(r, day, metric.key)" class="pt-val">
                                                {{ getPlanMergedVal(r, day, metric.key) }}
                                            </span>
                                        </td>
                                    </template>
                                    <!-- Split D | N -->
                                    <template v-else>
                                        <td
                                            class="pt-td pt-d-cell"
                                            :class="[getPlanCellClass(r, day, 'day', metric.key), { 'pt-weekend-td': isDayWeekend(day), 'pt-today-td': isDayToday(day) }]"
                                        >
                                            <span v-if="getPlanCellVal(r, day, 'day', metric.key)" class="pt-val">
                                                {{ getPlanCellVal(r, day, 'day', metric.key) }}
                                            </span>
                                        </td>
                                        <td
                                            class="pt-td pt-n-cell"
                                            :class="[getPlanCellClass(r, day, 'night', metric.key), { 'pt-weekend-td': isDayWeekend(day), 'pt-today-td': isDayToday(day) }]"
                                        >
                                            <span v-if="getPlanCellVal(r, day, 'night', metric.key)" class="pt-val">
                                                {{ getPlanCellVal(r, day, 'night', metric.key) }}
                                            </span>
                                        </td>
                                    </template>
                                </template>
                            </tr>

                            <!-- separator antar part -->
                            <tr class="pt-sep-row"><td :colspan="7 + daysInMonth * 2"></td></tr>
                        </template>
                    </tbody>
                </table>

                <!-- pagination mutasi -->
                <div v-if="totalPages > 1" class="pagination">
                    <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">
                        <i class="ti ti-chevron-left"></i>
                    </button>
                    <template v-for="p in pageNumbers" :key="p">
                        <span v-if="p === '...'" class="page-ellipsis">…</span>
                        <button v-else class="page-btn" :class="{ 'page-active': p === currentPage }" @click="currentPage = p as number">{{ p }}</button>
                    </template>
                    <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">
                        <i class="ti ti-chevron-right"></i>
                    </button>
                    <span class="page-info">{{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, filteredRows.length) }} dari {{ filteredRows.length }}</span>
                </div>
            </div>

            <!-- ── TAB: BELUM TERDAFTAR ── -->
            <div v-if="activeTab === 'unregistered'" class="unreg-section">

                <!-- Info banner -->
                <div class="unreg-banner">
                    <i class="ti ti-info-circle unreg-banner-icon"></i>
                    <span>Part ini sudah ikut diproses pipeline (area=STOCK), namun belum terdaftar di <strong>ms_welding</strong>. Segera daftarkan agar planning lebih akurat.</span>
                </div>

                <!-- Stats + Export -->
                <div class="unreg-toolbar">
                    <div class="unreg-stats">
                        <div class="unreg-stat">
                            <span class="unreg-stat-val">{{ enrichedMissingParts.length }}</span>
                            <span class="unreg-stat-lbl">Total</span>
                        </div>
                        <div class="unreg-stat">
                            <span class="unreg-stat-val accent-green">{{ enrichedMissingParts.filter(p => p.matched).length }}</span>
                            <span class="unreg-stat-lbl">Cocok MDFO</span>
                        </div>
                        <div class="unreg-stat">
                            <span class="unreg-stat-val accent-blue">{{ enrichedMissingParts.filter(p => p.dn_found).length }}</span>
                            <span class="unreg-stat-lbl">Ada DN</span>
                        </div>
                        <div class="unreg-stat">
                            <span class="unreg-stat-val accent-red">{{ enrichedMissingParts.filter(p => !p.matched && !p.dn_found).length }}</span>
                            <span class="unreg-stat-lbl">Tidak terdeteksi</span>
                        </div>
                    </div>
                    <button
                        v-if="enrichedMissingParts.length"
                        class="btn-export-csv"
                        @click="exportMissingPartsCSV"
                    >
                        <i class="ti ti-table-export"></i> Export CSV
                    </button>
                </div>

                <!-- Empty state -->
                <div v-if="!enrichedMissingParts.length" class="unreg-empty">
                    <i class="ti ti-circle-check" style="font-size:32px;color:#3B6D11;margin-bottom:8px"></i>
                    <p>Semua part IFPD sudah terdaftar di ms_welding.</p>
                </div>

                <!-- Enriched table -->
                <div v-else class="unreg-table-wrap">
                    <table class="unreg-table">
                        <thead>
                            <tr>
                                <th style="width:30px">#</th>
                                <th style="text-align:left">MATNR</th>
                                <th style="text-align:left">Nama Part</th>
                                <th>Tipe</th>
                                <th style="text-align:left">Customer</th>
                                <th style="text-align:right">Stok</th>
                                <th>MDFO</th>
                                <th style="text-align:right">pcs/bln</th>
                                <th>DN</th>
                                <th style="text-align:right">Total DN</th>
                                <th>KUNNR</th>
                                <th style="text-align:left">Process</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(p, i) in enrichedMissingParts" :key="p.MATNR" class="unreg-row">
                                <td class="ur-center ur-muted">{{ i + 1 }}</td>
                                <td class="ur-mono">{{ p.MATNR }}</td>
                                <td class="ur-name">{{ p.nama_part ?? '—' }}</td>
                                <td class="ur-center">
                                    <span
                                        class="ur-tipe"
                                        :class="(p.tipe_part === 'SUB-ASSY' || p.tipe_part === 'SEMI SUB-ASSY') ? 'ur-tipe-weld' : ''"
                                    >
                                        {{ p.tipe_part ?? '—' }}
                                    </span>
                                </td>
                                <td>{{ p.CUSTOMER ?? '—' }}</td>
                                <td class="ur-right">
                                    <span v-if="p.stok != null" class="labst-val" :class="p.stok === 0 ? 'labst-zero' : ''">
                                        {{ p.stok.toLocaleString() }}
                                    </span>
                                    <span v-else class="ur-muted">—</span>
                                </td>
                                <td class="ur-center">
                                    <span class="tag" :class="p.matched ? 'tag-match' : 'tag-skip'">
                                        {{ p.matched ? 'Match' : 'No match' }}
                                    </span>
                                </td>
                                <td class="ur-right">
                                    <span v-if="p.pcs_month > 0">{{ p.pcs_month.toLocaleString() }}</span>
                                    <span v-else class="ur-muted">—</span>
                                </td>
                                <td class="ur-center">
                                    <span class="tag" :class="p.dn_found ? 'tag-dn' : 'tag-nodn'">
                                        {{ p.dn_found ? 'Ada' : 'Tidak' }}
                                    </span>
                                </td>
                                <td class="ur-right">
                                    <span v-if="p.dn_total > 0" class="dn-qty">{{ p.dn_total.toLocaleString() }}</span>
                                    <span v-else class="ur-muted">—</span>
                                </td>
                                <td class="ur-center">
                                    <span v-if="p.kunnr" class="kunnr-tag">{{ p.kunnr }}</span>
                                    <span v-else class="ur-muted">—</span>
                                </td>
                                <td class="ur-process">{{ p.PROCESS ?? '—' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>

        </div>

    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'

// ─── types ───────────────────────────────────────────────────────────────────

type StepState = 'idle' | 'active' | 'done' | 'error'

interface LogItem  { msg: string; type: 'success' | 'warn' | 'error' | '' }
interface StepData { state: StepState; pct: number; logs: LogItem[]; visible: boolean }

interface DnDay      { s1: number; s2: number }
interface WdDay      { day: number; night: number }   // 0 | 0.5 | 1
interface ActprodDay { d:  number; n:  number }

interface RollingPoint {
    balance:      number   // opening − dn  (bisa negatif = defisit)
    actual_stock: number   // balance + actprod
    strength_h:   number   // actual_stock ÷ hourly_rate  (jam)
}

interface MissingStockPart {
    MATNR:     string
    nama_part: string | null
    tipe_part: string | null
    CUSTOMER:  string | null
    stok:      number | null
    PROCESS:   string | null
}

interface EnrichedMissingPart extends MissingStockPart {
    matched:   boolean
    pcs_month: number
    dn_found:  boolean
    dn_total:  number
    kunnr:     string | null
}

interface TableRow {
    part_number_mix: string
    part_number:     string
    job_number:      string | null
    area:            string
    model:           string | null
    pcs_day:         string | number | null
    qty_kbn:         number | null
    pcs_month:       number
    pcs_day_mdfo:    number | null
    pcs_daily:       Record<string, number>            | null   // pcs_per_day per hari (weekly avg dari M_formula_engine)
    matched:         boolean
    mdfo_daily:      Record<string, number>            | null
    kunnr:           string                            | null
    dn_total:        number
    dn_daily:        Record<string, DnDay>             | null
    wd_day_total:    number
    wd_night_total:  number
    wd_daily:        Record<string, WdDay>             | null
    labst:           number                            | null
    init_stock:      number                            | null
    uph:             number                            | null
    actprod_daily:   Record<string, ActprodDay>        | null
    plan_daily:      Record<string, ActprodDay>        | null   // SMART CLAMP output (format sama: d/n)
}

// ─── config ───────────────────────────────────────────────────────────────────

const API_BASE = 'http://192.168.10.67/majsf_rest_api'

// ─── spmon options ────────────────────────────────────────────────────────────

function buildSpmonOptions() {
    const opts = []
    const now  = new Date()
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        opts.push({ value: `${y}${m}`, label: `${m}/${y}` })
    }
    return opts
}
const spmonOptions  = buildSpmonOptions()
const selectedSpmon = ref(spmonOptions[0].value)
const selectedArea  = ref('')
const spmonLabel    = computed(() => spmonOptions.find(o => o.value === selectedSpmon.value)?.label ?? selectedSpmon.value)

// ─── state ───────────────────────────────────────────────────────────────────

const dynamicAreas      = ref<string[]>([])
const doneAreas         = ref<string[]>([])
const activeArea        = ref('')
const activeTab         = ref<'summary' | 'mutasi' | 'unregistered'>('summary')
const missingStockParts = ref<MissingStockPart[]>([])
const showMissingStock  = ref(false)

// inline edit init_stock
const editingInitStockKey = ref<string | null>(null)
const editInitStockVal    = ref(0)
const initStockInputRef   = ref<HTMLInputElement | null>(null)

const pipelineStatus = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const isRunning      = computed(() => pipelineStatus.value === 'running')

const metrics = ref<{
    totalArea?:    number
    fp?:           number
    matched?:      number
    noMatch?:      number
    dnFound?:      number
    dnNotFound?:   number
    wdFound?:      number
    wdNotFound?:   number
    actFound?:     number
    actNotFound?:  number
    planFound?:    number
    planSkipped?:  number
}>({})

const tableRows   = ref<TableRow[]>([])
const filterArea  = ref('')
const filterMatch = ref('')

const pipelineSummary = ref<{
    spmon?:           string
    total_stage?:     number
    mdfo_matched?:    number
    mdfo_no_match?:   number
    dn_found?:        number
    dn_not_found?:    number
    wd_found?:        number
    wd_not_found?:    number
    act_found?:       number
    act_not_found?:   number
    plan_eligible?:   number   // FP dengan op — subset dari total_stage yang masuk Step 6
    plan_found?:      number
    plan_not_found?:  number
    pipeline_status?: string
    notes?:           string[]
}>({})

const filteredRows = computed(() =>
    tableRows.value.filter(r => {
        const areaOk  = !filterArea.value  || r.area === filterArea.value
        const matchOk = !filterMatch.value
            || (filterMatch.value === 'match'   &&  r.matched)
            || (filterMatch.value === 'nomatch' && !r.matched)
            || (filterMatch.value === 'nodn'    &&  r.matched && r.dn_total === 0)
        return areaOk && matchOk
    })
)

const enrichedMissingParts = computed<EnrichedMissingPart[]>(() =>
    missingStockParts.value.map(p => {
        const row = tableRows.value.find(r => r.part_number_mix === 'STK-' + p.MATNR)
        return {
            ...p,
            matched:   row?.matched          ?? false,
            pcs_month: row?.pcs_month        ?? 0,
            dn_found:  (row?.dn_total ?? 0)  >  0,
            dn_total:  row?.dn_total          ?? 0,
            kunnr:     row?.kunnr             ?? null,
        }
    })
)

// ─── pagination ───────────────────────────────────────────────────────────────

const pageSize    = 10
const currentPage = ref(1)
const totalPages  = computed(() => Math.ceil(filteredRows.value.length / pageSize))
const paginatedRows = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return filteredRows.value.slice(start, start + pageSize)
})
const pageNumbers = computed(() => {
    const total = totalPages.value
    const cur   = currentPage.value
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages: (number | string)[] = [1]
    if (cur > 3)         pages.push('...')
    for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p)
    if (cur < total - 2) pages.push('...')
    pages.push(total)
    return pages
})
watch(filteredRows, () => { currentPage.value = 1 })

// ─── elapsed ──────────────────────────────────────────────────────────────────

const elapsedSec   = ref(0)
const elapsedLabel = computed(() => elapsedSec.value ? `${elapsedSec.value}s` : '—')
let elapsedTimer: ReturnType<typeof setInterval> | null = null

// ─── steps ───────────────────────────────────────────────────────────────────

const step1    = ref<StepData>({ state: 'idle', pct: 0, logs: [], visible: false })
const step2    = ref<StepData>({ state: 'idle', pct: 0, logs: [], visible: false })
const step3    = ref<StepData>({ state: 'idle', pct: 0, logs: [], visible: false })
const step4    = ref<StepData>({ state: 'idle', pct: 0, logs: [], visible: false })
const step5    = ref<StepData>({ state: 'idle', pct: 0, logs: [], visible: false })
const step6    = ref<StepData>({ state: 'idle', pct: 0, logs: [], visible: false })
const step7    = ref<StepData>({ state: 'idle', pct: 0, logs: [], visible: false })

interface Step7Warning { type: string; count: number; message: string }
const step7Warnings = ref<Step7Warning[]>([])

// ─── stage streaming state (M_formula_engine protocol) ───────────────────────

/** Sub-step indicator per stage: how many internal steps have fired vs total */
const stageSubStep    = ref<Record<number, { current: number; total: number }>>({})
/** Last detail string per stage (for display in sidebar) */
const stageLastDetail = ref<Record<number, string>>({})
/** Last rows count per stage */
const stageLastRows   = ref<Record<number, number>>({})

const log1Ref  = ref<HTMLElement | null>(null)
const log2Ref  = ref<HTMLElement | null>(null)
const log3Ref  = ref<HTMLElement | null>(null)
const log4Ref  = ref<HTMLElement | null>(null)
const log5Ref  = ref<HTMLElement | null>(null)
const log6Ref  = ref<HTMLElement | null>(null)
const log7Ref  = ref<HTMLElement | null>(null)

// Separate state untuk Re-run SMART CLAMP (tanpa full pipeline)
const clampRunning = ref(false)

// ─── plan metrics ─────────────────────────────────────────────────────────────

const PLAN_METRICS = [
    { key: 'mdfo',           label: 'MDFO',           cssKey: 'mdfo'     },
    { key: 'act_delivery',   label: 'ACT.DELIVERY',   cssKey: 'dn'       },
    { key: 'plan_produksi',  label: 'PLAN PRODUKSI',  cssKey: 'plan'     },
    { key: 'act_production', label: 'ACT.PRODUCTION', cssKey: 'act-prod' },
    { key: 'balance',        label: 'BALANCE',         cssKey: 'balance'  },
    { key: 'actual_stock',   label: 'ACTUAL STOCK',   cssKey: 'stock'    },
    { key: 'strength',       label: 'STRENGTH',        cssKey: 'strength' },
    { key: 'pcs_day',        label: 'PCS/DAY',         cssKey: 'pcsday'  },
] as const

type PlanMetricKey = typeof PLAN_METRICS[number]['key']

// ─── daily helpers ────────────────────────────────────────────────────────────

const daysInMonth = computed(() => {
    const y = parseInt(selectedSpmon.value.slice(0, 4))
    const m = parseInt(selectedSpmon.value.slice(4, 6))
    return new Date(y, m, 0).getDate()
})

// ─── rolling stock ────────────────────────────────────────────────────────────

/**
 * Hitung rolling stock per part per hari per shift.
 * Urutan akumulasi: init_stock → [d1 D] → [d1 N] → [d2 D] → ... → [d31 N]
 *
 * BALANCE      = opening − dn  (bisa negatif = stok defisit sebelum produksi)
 * ACTUAL STOCK = BALANCE + actprod  (0 jika belum ada data aktual)
 * STRENGTH_h   = ACTUAL STOCK ÷ hourly_rate
 *   hourly_rate = uph            jika uph > 0
 *               = pcs_day × 16  ÷ pcs_day  = 16 ÷ ... → simplified:
 *               = pcs_day_mdfo ÷ 16        (16 jam kerja efektif per hari)
 */
function computeRolling(row: TableRow, totalDays: number): Record<number, { d: RollingPoint; n: RollingPoint }> {
    const uph  = row.uph ?? 0
    const init = row.init_stock ?? row.labst ?? 0

    const result: Record<number, { d: RollingPoint; n: RollingPoint }> = {}
    let opening = init

    for (let d = 1; d <= totalDays; d++) {
        const dn_d   = row.dn_daily?.[String(d)]?.s1 ?? 0
        const dn_n   = row.dn_daily?.[String(d)]?.s2 ?? 0
        const act_d  = row.actprod_daily?.[String(d)]?.d ?? 0
        const act_n  = row.actprod_daily?.[String(d)]?.n ?? 0

        // pcs_per_day per hari (weekly avg — berbeda tiap minggu)
        const pcsDay = row.pcs_daily?.[String(d)] ?? row.pcs_day_mdfo ?? 0
        // hourly rate: UPH jika ada, fallback = pcs_day ÷ 16 jam efektif
        const rate   = uph > 0 ? uph : (pcsDay > 0 ? pcsDay / 16 : 0)

        // Shift D
        const bal_d  = opening - dn_d
        const stk_d  = bal_d   + act_d
        // Strength fallback 0 ketika actual_stock minus (stok tidak bisa negatif jam-nya)
        const str_d  = rate > 0 ? Math.max(0, stk_d / rate) : 0

        // Shift N (opening = closing Shift D)
        const bal_n  = stk_d   - dn_n
        const stk_n  = bal_n   + act_n
        const str_n  = rate > 0 ? Math.max(0, stk_n / rate) : 0

        result[d] = {
            d: { balance: bal_d, actual_stock: stk_d, strength_h: str_d },
            n: { balance: bal_n, actual_stock: stk_n, strength_h: str_n },
        }

        opening = stk_n   // hari berikutnya mulai dari closing shift N
    }

    return result
}

/**
 * Map rolling per part_number_mix — di-recompute saat tableRows atau daysInMonth berubah.
 * Termasuk reaktif terhadap edit init_stock (karena mengubah tableRows[idx].init_stock).
 */
const rollingMap = computed(() => {
    const map = new Map<string, Record<number, { d: RollingPoint; n: RollingPoint }>>()
    const days = daysInMonth.value
    for (const row of tableRows.value) {
        map.set(row.part_number_mix, computeRolling(row, days))
    }
    return map
})

// ─── init stock edit ──────────────────────────────────────────────────────────

function startEditInitStock(row: TableRow) {
    editingInitStockKey.value = row.part_number_mix
    editInitStockVal.value    = row.init_stock ?? row.labst ?? 0
    nextTick(() => initStockInputRef.value?.select())
}

function cancelEditInitStock() {
    editingInitStockKey.value = null
}

async function saveInitStock(row: TableRow) {
    const val = editInitStockVal.value
    editingInitStockKey.value = null

    // Update local state — rollingMap recomputes otomatis
    const idx = tableRows.value.findIndex(r => r.part_number_mix === row.part_number_mix)
    if (idx !== -1) tableRows.value[idx].init_stock = val

    // Persist ke backend
    try {
        await fetch(`${API_BASE}/api/welding_autoplanning/update_init_stock`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                spmon:           selectedSpmon.value,
                part_number_mix: row.part_number_mix,
                init_stock:      val,
            }),
        })
    } catch { /* silent — local state sudah diupdate */ }
}

function isDayWeekend(day: number): boolean {
    const y = parseInt(selectedSpmon.value.slice(0, 4))
    const m = parseInt(selectedSpmon.value.slice(4, 6)) - 1
    return [0, 6].includes(new Date(y, m, day).getDay())
}

function isDayToday(day: number): boolean {
    const now = new Date()
    const y   = parseInt(selectedSpmon.value.slice(0, 4))
    const m   = parseInt(selectedSpmon.value.slice(4, 6))
    return now.getFullYear() === y && (now.getMonth() + 1) === m && now.getDate() === day
}

/**
 * Apakah metrik ini menggunakan sel merged (colspan=2) — tidak split D/N.
 * MDFO dan PCS/DAY adalah nilai harian total, bukan per shift.
 */
function isMergedMetric(key: PlanMetricKey): boolean {
    return key === 'mdfo' || key === 'pcs_day'
}

/**
 * Nilai untuk sel merged (colspan=2): MDFO dan PCS/DAY.
 */
function getPlanMergedVal(row: TableRow, day: number, metricKey: PlanMetricKey): string {
    switch (metricKey) {
        case 'mdfo': {
            const v = row.mdfo_daily?.[String(day)] ?? 0
            return v > 0 ? v.toLocaleString() : ''
        }
        case 'pcs_day': {
            // pcs_daily per hari dari PHP baru (weekly avg beda tiap minggu)
            // fallback ke pcs_day_mdfo jika PHP lama (satu nilai flat)
            const v = row.pcs_daily?.[String(day)] ?? row.pcs_day_mdfo ?? 0
            return v > 0 ? v.toLocaleString() : ''
        }
        default:
            return ''
    }
}

/**
 * Nilai untuk sel split D/N per metrik per hari.
 * Return empty string jika tidak ada data.
 */
function getPlanCellVal(row: TableRow, day: number, shift: 'day' | 'night', metricKey: PlanMetricKey): string {
    switch (metricKey) {
        case 'act_delivery': {
            const dnShift = shift === 'day' ? 's1' : 's2'
            const v = row.dn_daily?.[String(day)]?.[dnShift] ?? 0
            return v > 0 ? v.toLocaleString() : ''
        }
        case 'act_production': {
            const key = shift === 'day' ? 'd' : 'n'
            const v = row.actprod_daily?.[String(day)]?.[key] ?? 0
            return v > 0 ? v.toLocaleString() : ''
        }
        case 'balance': {
            const pt = rollingMap.value.get(row.part_number_mix)?.[day]?.[shift === 'day' ? 'd' : 'n']
            if (!pt) return ''
            return pt.balance !== 0 ? pt.balance.toLocaleString() : '0'
        }
        case 'actual_stock': {
            const pt = rollingMap.value.get(row.part_number_mix)?.[day]?.[shift === 'day' ? 'd' : 'n']
            if (!pt) return ''
            return pt.actual_stock.toLocaleString()
        }
        case 'strength': {
            const pt = rollingMap.value.get(row.part_number_mix)?.[day]?.[shift === 'day' ? 'd' : 'n']
            if (!pt) return ''
            // actual_stock minus → strength sudah di-clamp ke 0, tampilkan '0' agar terlihat
            if (pt.actual_stock < 0) return '0'
            if (pt.strength_h <= 0) return ''
            return pt.strength_h.toFixed(1)
        }
        case 'plan_produksi': {
            const key = shift === 'day' ? 'd' : 'n'
            const v = row.plan_daily?.[String(day)]?.[key] ?? 0
            return v > 0 ? v.toLocaleString() : ''
        }
        default:
            return ''
    }
}

/**
 * Class workday coloring untuk tiap half-cell (D/N):
 *   wd=0          → pc-off      (abu-abu, libur)
 *   wd=0.5        → pc-half     (kuning, ½ hari)
 *   wd=0 & ada DN → pc-mismatch (oranye, order di hari libur)
 *   wd=-1         → tidak ada data WD, no class
 *   wd=1          → default (putih)
 *
 * Diperluas oleh getPlanCellClass — jangan dipanggil langsung dari template.
 */
function getPlanHalfClass(row: TableRow, day: number, shift: 'day' | 'night', metricKey: PlanMetricKey) {
    const wd      = row.wd_daily?.[String(day)]?.[shift] ?? -1
    const dnShift = shift === 'day' ? 's1' : 's2'
    const dnQty   = metricKey === 'act_delivery' ? (row.dn_daily?.[String(day)]?.[dnShift] ?? 0) : 0

    return {
        'pc-off':      wd === 0 && dnQty === 0,
        'pc-half':     wd === 0.5,
        'pc-mismatch': wd === 0  && dnQty > 0,
    }
}

/**
 * Class lengkap untuk split cell (D/N):
 * menggabungkan workday coloring + rolling-stock coloring per metrik.
 *
 * Strength threshold (jam):  < 12 = kritis,  12–20 = safe,  > 20 = over
 * Balance:  < 0 = defisit (merah)
 */
function getPlanCellClass(row: TableRow, day: number, shift: 'day' | 'night', metricKey: PlanMetricKey) {
    const base   = getPlanHalfClass(row, day, shift, metricKey)
    const shiftK = shift === 'day' ? 'd' : 'n'
    const pt     = rollingMap.value.get(row.part_number_mix)?.[day]?.[shiftK]

    const extra: Record<string, boolean> = {
        'str-crit':    false,
        'str-safe':    false,
        'str-over':    false,
        'bal-deficit': false,
        'has-plan':    false,
    }

    if (pt && metricKey === 'strength') {
        const h = pt.strength_h
        extra['str-crit'] = h < 12
        extra['str-safe'] = h >= 12 && h <= 20
        extra['str-over'] = h > 20
    }

    if (pt && metricKey === 'balance') {
        extra['bal-deficit'] = pt.balance < 0
    }

    if (metricKey === 'plan_produksi') {
        const key = shift === 'day' ? 'd' : 'n'
        extra['has-plan'] = (row.plan_daily?.[String(day)]?.[key] ?? 0) > 0
    }

    return { ...base, ...extra }
}

// ─── class helpers ────────────────────────────────────────────────────────────

const statusClass = computed(() => ({
    'badge-idle':    pipelineStatus.value === 'idle',
    'badge-running': pipelineStatus.value === 'running',
    'badge-done':    pipelineStatus.value === 'done',
    'badge-error':   pipelineStatus.value === 'error',
}))

const statusLabel = computed(() => ({
    idle: 'Idle', running: 'Running', done: 'Done', error: 'Error',
}[pipelineStatus.value]))

// Route untuk tabel mutasi — jika semua area pakai "SA ADM", jika spesifik pakai area yang dipilih
const mutasiRoute = computed(() =>
    `/welding/mutasi/${selectedArea.value || 'SA ADM'}`
)

function getStepCardClass(s: StepState) {
    return { 'step-active': s === 'active', 'step-done': s === 'done', 'step-error': s === 'error' }
}
function getStepNumClass(s: StepState) {
    return { 'num-active': s === 'active', 'num-done': s === 'done', 'num-error': s === 'error' }
}
function getStepStatClass(s: StepState) {
    return { 'stat-active': s === 'active', 'stat-done': s === 'done', 'stat-error': s === 'error' }
}
function getStepLabel(s: StepState) {
    return { idle: 'Waiting', active: 'Running…', done: 'Selesai', error: 'Error' }[s]
}
function getAreaChipClass(a: string) {
    if (doneAreas.value.includes(a)) return 'chip-done'
    if (activeArea.value === a)      return 'chip-active'
    return ''
}

// ─── step helpers ─────────────────────────────────────────────────────────────

function getStepRef(n: number) {
    if (n === 1) return step1
    if (n === 2) return step2
    if (n === 3) return step3
    if (n === 4) return step4
    if (n === 5) return step5
    if (n === 6) return step6
    return step7
}

function getLogRef(n: number) {
    if (n === 1) return log1Ref
    if (n === 2) return log2Ref
    if (n === 3) return log3Ref
    if (n === 4) return log4Ref
    if (n === 5) return log5Ref
    if (n === 6) return log6Ref
    return log7Ref
}

// ─── log helper ───────────────────────────────────────────────────────────────

function addLog(step: 1 | 2 | 3 | 4 | 5 | 6 | 7, msg: string, type: LogItem['type'] = '') {
    const s      = getStepRef(step)
    const refEl  = getLogRef(step)
    s.value.logs.push({ msg, type })
    nextTick(() => { if (refEl.value) refEl.value.scrollTop = refEl.value.scrollHeight })
}

// ─── tab ──────────────────────────────────────────────────────────────────────

function switchTab(tab: 'summary' | 'mutasi' | 'unregistered') {
    activeTab.value   = tab
    currentPage.value = 1
}

function exportMissingPartsCSV() {
    const BOM     = '﻿'
    const headers = ['MATNR', 'Nama Part', 'Tipe', 'Customer', 'Stok', 'MDFO Match', 'pcs/bln', 'Ada DN', 'Total DN', 'KUNNR', 'Process']
    const rows    = enrichedMissingParts.value.map(p =>
        [
            p.MATNR,
            p.nama_part ?? '',
            p.tipe_part ?? '',
            p.CUSTOMER  ?? '',
            p.stok      ?? 0,
            p.matched   ? 'Ya' : 'Tidak',
            p.pcs_month,
            p.dn_found  ? 'Ya' : 'Tidak',
            p.dn_total,
            p.kunnr     ?? '',
            p.PROCESS   ?? '',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    )
    const csv  = BOM + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `belum-terdaftar-${selectedSpmon.value}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
}

// ─── fetch areas on mount ─────────────────────────────────────────────────────

onMounted(async () => {
    try {
        const res  = await fetch(`${API_BASE}/api/welding_autoplanning/areas`)
        const json = await res.json()
        if (json.success && json.data.length) dynamicAreas.value = json.data
    } catch { /* silent */ }
})

// ─── pipeline ────────────────────────────────────────────────────────────────

function resetState() {
    pipelineStatus.value  = 'running'
    doneAreas.value       = []
    activeArea.value      = ''
    tableRows.value       = []
    metrics.value         = {}
    pipelineSummary.value = {}
    elapsedSec.value      = 0
    filterArea.value      = ''
    filterMatch.value     = ''
    currentPage.value     = 1
    activeTab.value         = 'summary'
    missingStockParts.value = []
    showMissingStock.value  = false
    step1.value = { state: 'idle', pct: 0, logs: [], visible: false }
    step2.value = { state: 'idle', pct: 0, logs: [], visible: false }
    step3.value = { state: 'idle', pct: 0, logs: [], visible: false }
    step4.value = { state: 'idle', pct: 0, logs: [], visible: false }
    step5.value = { state: 'idle', pct: 0, logs: [], visible: false }
    step6.value = { state: 'idle', pct: 0, logs: [], visible: false }
    step7.value = { state: 'idle', pct: 0, logs: [], visible: false }
    step7Warnings.value   = []
    stageSubStep.value    = {}
    stageLastDetail.value = {}
    stageLastRows.value   = {}
}

function startTimer() {
    if (elapsedTimer) clearInterval(elapsedTimer)
    const t0 = Date.now()
    elapsedTimer = setInterval(() => { elapsedSec.value = Math.round((Date.now() - t0) / 1000) }, 500)
}
function stopTimer() {
    if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null }
}

function runPipeline() {
    resetState()
    startTimer()
    const areaParam = selectedArea.value ? `&area=${encodeURIComponent(selectedArea.value)}` : ''
    const url = `${API_BASE}/api/welding_autoplanning/run_pipeline?spmon=${selectedSpmon.value}${areaParam}`
    const es  = new EventSource(url)

    es.addEventListener('stage_start',    e => handleEvent('stage_start',    JSON.parse(e.data)))
    es.addEventListener('stage_progress', e => handleEvent('stage_progress', JSON.parse(e.data)))
    es.addEventListener('stage_done',     e => handleEvent('stage_done',     JSON.parse(e.data)))
    es.addEventListener('stage_error',    e => handleEvent('stage_error',    JSON.parse(e.data)))
    es.addEventListener('done',  e => { handleEvent('done',  JSON.parse(e.data)); es.close() })
    es.addEventListener('error', () => {
        if (pipelineStatus.value !== 'done') { pipelineStatus.value = 'error'; stopTimer() }
        es.close()
    })
}

// ─── re-run SMART CLAMP (tanpa full pipeline) ─────────────────────────────────

function runClamp() {
    if (clampRunning.value || isRunning.value) return

    clampRunning.value = true
    // Reset only stages 6 & 7
    step6.value = { state: 'active', pct: 0, logs: [], visible: true }
    step7.value = { state: 'idle',   pct: 0, logs: [], visible: false }
    stageSubStep.value[6] = { current: 0, total: 4 }
    stageSubStep.value[7] = { current: 0, total: 2 }

    const areaParamC = selectedArea.value ? `&area=${encodeURIComponent(selectedArea.value)}` : ''
    const url = `${API_BASE}/api/welding_autoplanning/run_clamp?spmon=${selectedSpmon.value}${areaParamC}`
    const es  = new EventSource(url)

    es.addEventListener('stage_start', e => {
        const d     = JSON.parse(e.data) as Record<string, unknown>
        const stage = d.stage as number
        const s     = getStepRef(stage)
        s.value.state   = 'active'
        s.value.visible = true
        s.value.pct     = 0
        stageSubStep.value[stage] = { current: 0, total: d.steps_total as number }
        addLog(stage as 1|2|3|4|5|6|7, `▶ ${d.title}…`)
    })

    es.addEventListener('stage_progress', e => {
        const d         = JSON.parse(e.data) as Record<string, unknown>
        const stage     = d.stage       as number
        const stepNum   = d.stage_step  as number
        const stepTotal = d.stages_total as number
        const s         = getStepRef(stage)
        stageSubStep.value[stage] = { current: stepNum, total: stepTotal }
        s.value.pct = Math.round((stepNum / stepTotal) * 100)
        stageLastDetail.value[stage] = d.detail as string
        stageLastRows.value[stage]   = d.rows   as number
        addLog(stage as 1|2|3|4|5|6|7,
            `${d.step_label}: ${d.detail}`,
            (d.status as string) === 'OK' ? 'success' : ''
        )
    })

    es.addEventListener('stage_done', e => {
        const d     = JSON.parse(e.data) as Record<string, unknown>
        const stage = d.stage as number
        const s     = getStepRef(stage)
        s.value.state = 'done'
        s.value.pct   = 100
        addLog(stage as 1|2|3|4|5|6|7,
            `✓ ${d.title} selesai — ${(d.rows_total as number).toLocaleString()} baris (${d.elapsed_ms}ms)`,
            'success'
        )
    })

    es.addEventListener('done', () => {
        clampRunning.value = false
        fetchResult()
        es.close()
    })

    es.addEventListener('error', () => {
        clampRunning.value = false
        step6.value.state = 'error'
        es.close()
    })
}

// ─── event handler (M_formula_engine 7-stage SSE protocol) ───────────────────

function handleEvent(event: string, data: Record<string, unknown>) {
    switch (event) {

        case 'stage_start': {
            const stage = data.stage as number
            const s     = getStepRef(stage)
            s.value.state   = 'active'
            s.value.visible = true
            s.value.pct     = 0
            stageSubStep.value[stage] = { current: 0, total: data.steps_total as number }
            addLog(stage as 1|2|3|4|5|6|7, `▶ ${data.title}…`)
            break
        }

        case 'stage_progress': {
            const stage     = data.stage        as number
            const stepNum   = data.stage_step   as number
            const stepTotal = data.stages_total as number
            const s         = getStepRef(stage)

            // Advance sub-step indicator & progress bar
            stageSubStep.value[stage]    = { current: stepNum, total: stepTotal }
            s.value.pct                  = Math.round((stepNum / stepTotal) * 100)

            // Track last detail / rows for sidebar display
            stageLastDetail.value[stage] = data.detail as string
            stageLastRows.value[stage]   = data.rows   as number

            const status = data.status as string
            addLog(stage as 1|2|3|4|5|6|7,
                `${data.step_label}: ${data.detail}`,
                status === 'ERROR' ? 'error' : status === 'SKIP' ? '' : 'success'
            )

            // Stage 7 — parse alert count from step 8.9
            if (stage === 7 && data.step_internal === '8.9') {
                const detail     = data.detail as string
                const alertMatch = detail.match(/(\d+) peringatan/)
                const alertCount = alertMatch ? parseInt(alertMatch[1]) : 0
                if (alertCount > 0) {
                    step7Warnings.value.push({ type: '8.9', count: alertCount, message: detail })
                }
            }
            break
        }

        case 'stage_done': {
            const stage = data.stage as number
            const s     = getStepRef(stage)
            s.value.state = 'done'
            s.value.pct   = 100
            const rows = (data.rows_total as number) ?? 0
            const ms   = (data.elapsed_ms as number) ?? 0
            addLog(stage as 1|2|3|4|5|6|7,
                `✓ Selesai — ${rows.toLocaleString()} baris (${ms}ms)`,
                'success'
            )
            break
        }

        case 'stage_error': {
            const stage = data.stage as number
            const s     = getStepRef(stage)
            s.value.state = 'error'
            addLog(stage as 1|2|3|4|5|6|7, `✗ Error: ${data.message}`, 'error')
            pipelineStatus.value = 'error'
            stopTimer()
            break
        }

        case 'done': {
            pipelineStatus.value = 'done'
            const elapsedS = (data.elapsed_s as number) ?? (data.elapsed_ms as number) / 1000 ?? 0
            elapsedSec.value = Math.round(elapsedS)

            if (data.summary) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const s = data.summary as any
                pipelineSummary.value = {
                    spmon:           s.spmon            ?? selectedSpmon.value,
                    total_stage:     s.total_parts      ?? 0,
                    mdfo_matched:    s.mdfo_matched     ?? 0,
                    mdfo_no_match:   s.mdfo_no_match    ?? 0,
                    dn_found:        s.dn_found         ?? 0,
                    dn_not_found:    s.dn_not_found     ?? 0,
                    wd_found:        s.wd_found         ?? 0,
                    wd_not_found:    s.wd_not_found     ?? 0,
                    act_found:       s.act_found        ?? 0,
                    act_not_found:   s.act_not_found    ?? 0,
                    plan_eligible:   s.plan_eligible,
                    plan_found:      s.plan_found       ?? 0,
                    plan_not_found:  s.plan_not_found   ?? 0,
                    pipeline_status: s.pipeline_status  ?? 'VALID',
                    notes:           s.notes            ?? [],
                }
                addLog(7, '────────────────────────', '')
                addLog(7, `Total part: ${s.total_parts ?? '?'} | Plan: ${s.plan_found ?? '?'} | MDFO: ${s.mdfo_matched ?? '?'}`, 'success')
                addLog(7, `Status: ${s.pipeline_status ?? 'VALID'}`, 'success')
            }
            stopTimer()
            // Load full result table from mutasi_weld
            fetchResult()
            break
        }

        case 'error': {
            pipelineStatus.value = 'error'
            stopTimer()
            break
        }
    }
}

// ─── fetch result after pipeline done ────────────────────────────────────────

async function fetchResult() {
    try {
        const areaParamR = selectedArea.value ? `&area=${encodeURIComponent(selectedArea.value)}` : ''
        const res  = await fetch(`${API_BASE}/api/welding_autoplanning/result?spmon=${selectedSpmon.value}${areaParamR}`)
        const json = await res.json()
        if (!json.success || !Array.isArray(json.data)) return

        tableRows.value = json.data as TableRow[]

        // Recompute metrics from actual result data
        const rows = tableRows.value
        metrics.value.fp          = rows.length
        metrics.value.totalArea   = dynamicAreas.value.length
        metrics.value.matched     = rows.filter(r => r.matched).length
        metrics.value.noMatch     = rows.filter(r => !r.matched).length
        metrics.value.dnFound     = rows.filter(r => r.dn_total > 0).length
        metrics.value.dnNotFound  = rows.filter(r => r.dn_total === 0).length
        metrics.value.actFound    = rows.filter(r => r.actprod_daily != null).length
        metrics.value.actNotFound = rows.filter(r => r.actprod_daily == null).length
        metrics.value.planFound   = rows.filter(r => r.plan_daily   != null).length
        metrics.value.planSkipped = rows.filter(r => r.plan_daily   == null).length

        // Enrich pipelineSummary with accurate counts
        if (json.summary) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const s = json.summary as any
            pipelineSummary.value = {
                ...pipelineSummary.value,
                spmon:          pipelineSummary.value.spmon ?? json.spmon,
                total_stage:    s.total_parts   ?? pipelineSummary.value.total_stage,
                mdfo_matched:   s.mdfo_matched  ?? pipelineSummary.value.mdfo_matched,
                mdfo_no_match:  s.mdfo_nomatch  ?? pipelineSummary.value.mdfo_no_match,
                dn_found:       s.dn_found      ?? pipelineSummary.value.dn_found,
                plan_found:     s.plan_found    ?? pipelineSummary.value.plan_found,
                act_found:      s.act_found     ?? pipelineSummary.value.act_found,
            }
        }

    } catch { /* silent — pipeline result optional */ }
}
</script>

<style scoped>
* { box-sizing: border-box; }

/* ── stage animations ─────────────────────────────────────────────────────── */

/* Spinning arc around active stage number */
.step-num { position: relative; }

.step-num.num-active::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 2px solid transparent;
    border-top-color: #1D9E75;
    animation: stage-spin 0.85s linear infinite;
    pointer-events: none;
}
.step-num-clamp.num-active::after  { border-top-color: #0891B2; }
.step-num-validate.num-active::after { border-top-color: #D97706; }

@keyframes stage-spin { to { transform: rotate(360deg); } }

/* Log items slide in from the left — no blink, smooth entrance */
.log-item {
    animation: log-slide-in 0.22s ease both;
}
@keyframes log-slide-in {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0);    }
}

/* Sub-step badge X/N shown when stage is active */
.step-header-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
}
.substep-chip {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 999px;
    background: #E1F5EE;
    color: #0F6E56;
    letter-spacing: 0.02em;
    white-space: nowrap;
}
.substep-chip-clamp    { background: #CFFAFE; color: #0E4F5C; }
.substep-chip-validate { background: #FEF3C7; color: #78350F; }

/* Stage card — smooth glow on active, no abrupt border flash */
.step-card {
    transition: border-color 0.35s ease, box-shadow 0.35s ease;
}
.step-card.step-active {
    box-shadow: 0 0 0 3px rgba(29, 158, 117, 0.08);
}
.step-clamp.step-active   { box-shadow: 0 0 0 3px rgba(8, 145, 178, 0.10); }
.step-validate.step-active { box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.09); }

.page {
    min-height: 100vh;
    background: #f5f5f3;
    padding: 24px 32px;
    display: flex;
    flex-direction: column;
    gap: 18px;
}

/* ── header ── */
.page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-icon {
    width: 40px; height: 40px; border-radius: 10px;
    background: #E1F5EE; display: flex; align-items: center;
    justify-content: center; font-size: 20px; color: #0F6E56;
}
.page-title { font-size: 18px; font-weight: 500; color: #1a1a1a; margin: 0; }
.page-sub   { font-size: 12px; color: #888; margin: 2px 0 0; }
.header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.spmon-select {
    font-size: 13px; padding: 6px 10px; border-radius: 8px;
    border: 1px solid #d0d0cc; background: #fff; color: #1a1a1a; cursor: pointer;
}
.spmon-select:disabled { opacity: 0.5; cursor: default; }
.area-select { min-width: 110px; }

.status-badge { font-size: 11px; padding: 4px 10px; border-radius: 6px; font-weight: 500; }
.badge-idle    { background: #f0f0ee; color: #888; }
.badge-running { background: #E1F5EE; color: #0F6E56; }
.badge-done    { background: #EAF3DE; color: #3B6D11; }
.badge-error   { background: #FCEBEB; color: #A32D2D; }

.btn-run {
    display: flex; align-items: center; gap: 6px; font-size: 13px;
    padding: 7px 16px; border-radius: 8px; border: 1px solid #d0d0cc;
    background: #fff; color: #1a1a1a; cursor: pointer; transition: background 0.15s;
}
.btn-run:hover:not(:disabled) { background: #f0f0ee; }
.btn-run:disabled { opacity: 0.4; cursor: default; }

/* Re-run SMART CLAMP button — teal accent, distinct dari pipeline */
.btn-clamp {
    display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500;
    padding: 7px 14px; border-radius: 8px; border: 1px solid #0E9AB8;
    background: #ECFEFF; color: #0E7490; cursor: pointer; transition: all 0.15s;
    white-space: nowrap;
}
.btn-clamp:hover:not(:disabled) { background: #CFFAFE; border-color: #0891B2; }
.btn-clamp:disabled { opacity: 0.4; cursor: default; }

/* ── metrics ── */
.metrics-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; }
.metric-card { background: #fff; border: 0.5px solid #e0e0dc; border-radius: 10px; padding: 12px 16px; }
.metric-label { font-size: 11px; color: #888; margin-bottom: 4px; }
.metric-value { font-size: 22px; font-weight: 500; color: #1a1a1a; }
.accent-teal   { color: #0F6E56; }
.accent-green  { color: #3B6D11; }
.accent-red    { color: #A32D2D; }
.accent-blue   { color: #1D4ED8; }
.accent-purple { color: #6D28D9; }
.accent-clamp  { color: #0E7490; }          /* teal cyan — SMART CLAMP */

/* ── steps grid (2 col + step 5 full-width) ── */
.steps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.step-wide  { grid-column: 1 / -1; }

/* step 5/6 body — horizontal: kiri counters, kanan log */
.step5-body  { display: flex; gap: 20px; }
.step5-left  { flex: 0 0 200px; display: flex; flex-direction: column; gap: 0; }
.step5-right { flex: 1; min-width: 0; }
.step5-right .log-list { max-height: 150px; }

/* Step 6 — SMART CLAMP card accent */
.step-clamp { border-color: #A5F3FC; }
.step-clamp.step-active { border-color: #0891B2 !important; }
.step-clamp.step-done   { border-color: #0E7490 !important; }
.step-num-clamp.num-active { background: #CFFAFE; color: #0E4F5C; }
.step-num-clamp.num-done   { background: #A5F3FC; color: #0C4A6E; }
.progress-fill-clamp { background: #0891B2 !important; }

/* Step 7 — Validasi & Peringatan */
.step-validate { border-color: #FDE68A; }
.step-validate.step-active { border-color: #D97706 !important; }
.step-validate.step-done   { border-color: #059669 !important; }
.step-num-validate.num-active { background: #FEF3C7; color: #78350F; }
.step-num-validate.num-done   { background: #D1FAE5; color: #065F46; }
.progress-fill-validate { background: #D97706 !important; }
.counter.validate-ok   { color: #059669; font-weight: 500; }
.counter.validate-warn { color: #B45309; font-weight: 500; }
.validate-alerts { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.validate-alert-item {
    display: flex; align-items: flex-start; gap: 8px;
    background: #FFFBEB; border: 0.5px solid #FDE68A;
    border-radius: 6px; padding: 6px 10px;
}
.validate-badge {
    font-size: 11px; font-weight: 700; color: #92400E;
    background: #FEF3C7; border-radius: 4px;
    padding: 0 5px; flex-shrink: 0; line-height: 18px;
}
.validate-msg { font-size: 11.5px; color: #78350F; line-height: 1.4; }

/* CLAMP legend di step 6 kiri */
.clamp-legend { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; }
.clamp-legend-item { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: #555; }
.clamp-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
.clamp-dot-crit { background: #fee2e2; border: 1px solid #ef4444; }
.clamp-dot-safe { background: #dcfce7; border: 1px solid #4ade80; }
.clamp-dot-over { background: #fef3c7; border: 1px solid #facc15; }
.step-card {
    background: #fff; border: 0.5px solid #e0e0dc;
    border-radius: 12px; padding: 16px;
    transition: border-color 0.35s ease, box-shadow 0.35s ease;
}
.step-card.step-active { border-color: #1D9E75; }
.step-card.step-done   { border-color: #639922; }
.step-card.step-error  { border-color: #E24B4A; }

.step-header { display: flex; align-items: flex-start; gap: 12px; }
.step-num {
    width: 26px; height: 26px; border-radius: 50%; display: flex;
    align-items: center; justify-content: center; font-size: 12px;
    font-weight: 500; flex-shrink: 0; background: #f0f0ee; color: #888;
}
.step-num.num-active { background: #9FE1CB; color: #085041; }
.step-num.num-done   { background: #C0DD97; color: #27500A; }
.step-num.num-error  { background: #F7C1C1; color: #791F1F; }
.step-info  { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.step-title { font-size: 13px; font-weight: 500; color: #1a1a1a; }
.step-desc  { font-size: 11px; color: #aaa; }
.step-stat  { font-size: 11px; color: #aaa; flex-shrink: 0; }
.step-stat.stat-active { color: #0F6E56; }
.step-stat.stat-done   { color: #3B6D11; }
.step-stat.stat-error  { color: #A32D2D; }

.step-body { margin-top: 14px; padding-top: 14px; border-top: 0.5px solid #eee; }
.progress-wrap { height: 3px; background: #f0f0ee; border-radius: 2px; overflow: hidden; margin-bottom: 12px; }
.progress-fill { height: 100%; background: #1D9E75; border-radius: 2px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }

.area-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.area-chip {
    display: flex; align-items: center; gap: 4px; font-size: 11px;
    padding: 3px 8px; border-radius: 6px; background: #f0f0ee;
    color: #888; border: 0.5px solid #e0e0dc; transition: all 0.2s;
}
.area-chip.chip-active { background: #E1F5EE; color: #0F6E56; border-color: #5DCAA5; }
.area-chip.chip-done   { background: #EAF3DE; color: #3B6D11; border-color: #97C459; }

.step2-counters { display: flex; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
.counter { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; }
.counter.match    { color: #3B6D11; }
.counter.nomatch  { color: #A32D2D; }
.counter.nodata   { color: #888; }
.counter.clamp-ok { color: #0E7490; }

.log-list { display: flex; flex-direction: column; gap: 4px; max-height: 130px; overflow-y: auto; }
.log-item { display: flex; align-items: flex-start; gap: 8px; font-size: 11px; color: #666; }
.log-dot  { width: 5px; height: 5px; border-radius: 50%; background: #ccc; flex-shrink: 0; margin-top: 4px; }
.log-item.success .log-dot  { background: #1D9E75; }
.log-item.warn    .log-dot  { background: #BA7517; }
.log-item.error   .log-dot  { background: #E24B4A; }
.log-item.success .log-text { color: #1a1a1a; }
.log-item.warn    .log-text { color: #633806; }
.log-item.error   .log-text { color: #791F1F; }
.log-list::-webkit-scrollbar { height: 4px; width: 4px; }
.log-list::-webkit-scrollbar-track { background: transparent; }
.log-list::-webkit-scrollbar-thumb { background: #d0d0cc; border-radius: 2px; }

/* ── pipeline summary ── */
.summary-wrap { background: #fff; border: 0.5px solid #e0e0dc; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 16px; }
.summary-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.summary-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.summary-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.summary-sub   { font-size: 12px; color: #888; margin-top: 2px; }
.summary-status { font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 999px; }
.summary-valid   { background: #EAF3DE; color: #3B6D11; }
.summary-invalid { background: #FCEBEB; color: #A32D2D; }
/* mutation link button */
.btn-mutasi {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 13px; border-radius: 8px;
    background: #EEF2FF; color: #3730A3;
    font-size: 12px; font-weight: 500;
    text-decoration: none; border: 1px solid #C7D2FE;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
}
.btn-mutasi:hover { background: #E0E7FF; border-color: #A5B4FC; }
.btn-mutasi i { font-size: 13px; }
.mutasi-area-chip {
    background: #C7D2FE; color: #3730A3;
    font-size: 10px; font-weight: 600;
    padding: 1px 7px; border-radius: 99px;
    letter-spacing: 0.02em;
}
.summary-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; }
.summary-item { display: flex; flex-direction: column; gap: 4px; background: #fafaf8; border-radius: 10px; padding: 12px; }
.summary-label { font-size: 11px; color: #888; }
.summary-value { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.summary-value.success           { color: #3B6D11; }
.summary-value.warn              { color: #A32D2D; }
.summary-value.info              { color: #1D4ED8; }
.summary-value.muted             { color: #aaa; }
.summary-value.accent-purple-val { color: #6D28D9; }
.summary-value.accent-clamp-val  { color: #0E7490; }
.summary-notes { display: flex; flex-direction: column; gap: 8px; }
.summary-note  { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #555; }
.summary-note i { margin-top: 1px; color: #0F6E56; }

/* ── result section ── */
.result-section { background: #fff; border: 0.5px solid #e0e0dc; border-radius: 12px; overflow: hidden; }
.result-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 16px; background: #fafaf8; border-bottom: 1px solid #e8e8e4;
    flex-wrap: wrap; gap: 8px; min-height: 44px;
}
.result-toolbar-left  { display: flex; align-items: center; gap: 4px; }
.result-toolbar-right { display: flex; align-items: center; gap: 8px; padding: 6px 0; flex-wrap: wrap; }

.tab-btn {
    display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 500; color: #888;
    padding: 10px 14px; border: none; background: transparent; cursor: pointer;
    border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; white-space: nowrap;
}
.tab-btn:hover { color: #0F6E56; }
.tab-active { color: #0F6E56 !important; border-bottom-color: #1D9E75 !important; font-weight: 600; }

.result-count  { font-size: 11px; color: #aaa; padding: 2px 8px; margin-left: 6px; }
.result-spmon  { font-size: 10px; padding: 2px 8px; border-radius: 5px; background: #E1F5EE; color: #0F6E56; font-weight: 500; }

/* WD legend */
.wd-legend { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.wd-legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #666; white-space: nowrap; }
.wd-dot { width: 10px; height: 10px; border-radius: 2px; border: 0.5px solid #d0d0cc; display: inline-block; }
.wd-full        .wd-dot { background: #fff; }
.wd-half-legend .wd-dot { background: #fef9c3; }
.wd-off-legend  .wd-dot { background: #e8e8e6; }
.wd-warn-legend .wd-dot { background: #ffedd5; border-color: #fb923c; }

.filter-select { font-size: 12px; padding: 4px 8px; border-radius: 6px; border: 0.5px solid #d0d0cc; background: #fff; color: #1a1a1a; cursor: pointer; }

/* ── summary table ── */
.summary-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.summary-table thead th {
    background: linear-gradient(180deg, #2d4a7a 0%, #1e3354 100%);
    color: #fff; font-size: 10.5px; font-weight: 600; padding: 8px 10px; text-align: center;
    border-right: 0.5px solid rgba(255,255,255,0.1); white-space: nowrap;
}
.summary-row td { padding: 7px 10px; border-bottom: 0.5px solid #f0f0ee; color: #1a1a1a; vertical-align: middle; }
.summary-row:last-child td { border-bottom: none; }
.summary-row:hover td { background: #f7f9fc; }
.s-center { text-align: center !important; }
.s-right  { text-align: right !important; }
.s-muted  { color: #bbb; font-size: 10px; }
.s-mono   { font-family: 'Consolas', monospace; font-size: 10.5px; }

.dn-qty        { font-size: 11px; font-weight: 600; color: #1D4ED8; }
.kunnr-tag     { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #EFF6FF; color: #1D4ED8; font-family: 'Consolas', monospace; }
.wd-total-day  { font-size: 11px; font-weight: 600; color: #0F6E56; }
.wd-total-night{ font-size: 11px; font-weight: 600; color: #6D28D9; }
.labst-val     { font-size: 11px; font-weight: 600; color: #374151; }
.labst-zero    { color: #DC2626 !important; }

/* ── missing stock panel (Step 1) ── */
.missing-stock-wrap { margin-top: 10px; border: 0.5px solid #FDE68A; border-radius: 8px; overflow: hidden; }
.missing-stock-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 7px 10px; background: #FFFBEB; cursor: pointer; user-select: none;
}
.missing-stock-header:hover { background: #FEF3C7; }
.missing-badge {
    display: flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 600; color: #92400E;
}
.missing-badge i { color: #F59E0B; }
.missing-stock-table-wrap { max-height: 220px; overflow-y: auto; }
.missing-stock-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
.missing-stock-table thead th {
    background: #FEF9C3; color: #78350F; font-size: 10px; font-weight: 600;
    padding: 5px 8px; text-align: left; position: sticky; top: 0;
    border-bottom: 0.5px solid #FDE68A; white-space: nowrap;
}
.missing-stock-table tbody tr:hover td { background: #FFFBEB; }
.missing-stock-table td { padding: 5px 8px; border-bottom: 0.5px solid #FEF3C7; color: #374151; white-space: nowrap; }
.ms-mono { font-family: 'Consolas', monospace; font-size: 10px; }
.ms-remark { font-size: 10px; padding: 1px 5px; border-radius: 4px; background: #f0f0ee; color: #555; }
.ms-welding { background: #FEF9C3 !important; color: #92400E !important; font-weight: 600; }

/* ── pagination ── */
.pagination { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 10px 16px; border-top: 0.5px solid #f0f0ee; background: #fafaf8; }
.page-btn {
    min-width: 28px; height: 28px; padding: 0 6px; border: 0.5px solid #d0d0cc; border-radius: 6px;
    background: #fff; color: #555; font-size: 11px; cursor: pointer; display: flex;
    align-items: center; justify-content: center; transition: all 0.15s;
}
.page-btn:hover:not(:disabled) { background: #E1F5EE; border-color: #5DCAA5; color: #0F6E56; }
.page-btn:disabled { opacity: 0.35; cursor: default; }
.page-active { background: #0F6E56 !important; border-color: #0F6E56 !important; color: #fff !important; font-weight: 600; }
.page-ellipsis { font-size: 12px; color: #bbb; padding: 0 4px; }
.page-info     { font-size: 11px; color: #888; margin-left: 8px; white-space: nowrap; }

/* ── common tags ── */
.area-inline { font-size: 10.5px; padding: 2px 7px; border-radius: 5px; background: #f0f0ee; color: #555; }
.tag { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 5px; font-weight: 500; }
.tag-match { background: #EAF3DE; color: #3B6D11; }
.tag-skip  { background: #FCEBEB; color: #A32D2D; }

/* ── mutasi scroll (container bersama) ── */
.mutasi-scroll { overflow: auto; max-height: 580px; }
.mutasi-scroll::-webkit-scrollbar       { height: 7px; width: 7px; }
.mutasi-scroll::-webkit-scrollbar-track { background: #f1f1ef; border-radius: 4px; }
.mutasi-scroll::-webkit-scrollbar-thumb { background: #4472c4; border-radius: 4px; }
.mutasi-scroll::-webkit-scrollbar-thumb:hover { background: #2e5396; }

/* ── plan table ── */
.plan-table { border-collapse: separate; border-spacing: 0; font-size: 11px; width: max-content; min-width: 100%; }

/* header */
.pt-th {
    position: sticky; top: 0; z-index: 10;
    background: linear-gradient(180deg, #2d4a7a 0%, #1e3354 100%);
    color: #fff; font-size: 10.5px; font-weight: 600; padding: 6px 4px;
    text-align: center; white-space: nowrap;
    border-bottom: 2px solid #1a2d5a; border-right: 0.5px solid rgba(255,255,255,0.1);
    user-select: none;
}
.pt-th-sep { border-right: 2px solid rgba(255,255,255,0.3) !important; }

/* header — frozen cells (rowspan=2, always on top of both header rows) */
.pt-th.pt-frozen { position: sticky !important; z-index: 30 !important; }

/* header row 1 — nomor hari (colspan=2 per hari) */
.pt-day-th { background: linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%) !important; font-size: 11px; font-weight: 700; padding: 5px 4px; }
.pt-weekend-th { background: linear-gradient(180deg, #b91c1c 0%, #991b1b 100%) !important; }
.pt-today-th   { background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%) !important; box-shadow: inset 0 4px 0 0 #f59e0b; }

/* header row 2 — label D / N (sticky di bawah row 1) */
.pt-sub-th {
    position: sticky; top: 28px; z-index: 10;
    background: linear-gradient(180deg, #162f6b 0%, #0f2054 100%);
    color: rgba(255,255,255,0.75); font-size: 8px; font-weight: 700;
    padding: 2px 3px; text-align: center; white-space: nowrap;
    border-bottom: 2px solid #0d1a40; border-right: 0.5px solid rgba(255,255,255,0.08);
    user-select: none;
}
.pt-sub-th.pt-weekend-th { background: linear-gradient(180deg, #7f1d1d 0%, #6b1515 100%) !important; }
.pt-sub-th.pt-today-th   { background: linear-gradient(180deg, #0c111e 0%, #161f36 100%) !important; }

/* body cells (base) */
.pt-td {
    border-bottom: 0.5px solid #f0f0ee;
    border-right:  0.5px solid #ebebea;
    color: #1a1a1a; vertical-align: middle; white-space: nowrap;
    background: #fff;
}

/* frozen body cells */
.pt-td.pt-frozen { position: sticky !important; z-index: 15 !important; background: #fff; border-right: 0.5px solid #e0e0dc; }
.pt-row:hover .pt-td.pt-frozen { background: #f4f7fc !important; }

/* info cells (yang kena rowspan=8) */
.pt-td.pt-info { font-size: 10.5px; padding: 4px 5px; }

/* DESC cell — frozen, warna per metrik */
.pt-td.pt-desc { font-size: 10px; font-weight: 600; padding: 0 6px; border-right: 2px solid #c8c8c4 !important; }

.pt-desc-mdfo     { background: #dbeafe !important; color: #1e40af; }
.pt-desc-dn       { background: #dcfce7 !important; color: #15803d; }
.pt-desc-plan     { background: #CFFAFE !important; color: #0E7490; }   /* SMART CLAMP — cyan */
.pt-desc-act-prod { background: #f3f4f6 !important; color: #374151; }
.pt-desc-balance  { background: #fef9c3 !important; color: #92400e; }
.pt-desc-stock    { background: #ede9fe !important; color: #5b21b6; }
.pt-desc-strength { background: #fff7ed !important; color: #c2410c; }
.pt-desc-pcsday   { background: #fce7f3 !important; color: #9d174d; }

/* baris pertama tiap part: border top lebih tebal */
.pt-row-first .pt-td { border-top: 1.5px solid #c8d0e0; }

/* day cells — background weekend/today */
.pt-weekend-td { background: #fff6f6 !important; }
.pt-today-td   { background: #eff6ff !important; box-shadow: inset 0 0 0 1px #bfdbfe; }
.pt-row:hover .pt-weekend-td { background: #ffe4e4 !important; }
.pt-row:hover .pt-today-td   { background: #dbeafe !important; }

/* kolom D (shift day) */
.pt-d-cell {
    width: 22px; padding: 3px 1px; text-align: center;
    border-right: 0.5px solid rgba(0,0,0,0.07);
}
/* kolom N (shift night) */
.pt-n-cell {
    width: 22px; padding: 3px 1px; text-align: center;
}

/* sel merged (colspan=2) — MDFO & PCS/DAY */
.pt-merged-cell {
    padding: 3px 4px; text-align: center;
}

/* workday coloring — berlaku pada pt-d-cell / pt-n-cell */
.pc-off      { background: #e8e8e6 !important; }                              /* libur — abu */
.pc-half     { background: #fef9c3 !important; }                              /* ½ hari — kuning */
.pc-mismatch { background: #ffedd5 !important; outline: 1px solid #fb923c; } /* order di libur — oranye */

/* rolling stock coloring */
.str-crit { background: #fee2e2 !important; }                                /* strength < 12 jam — merah */
.str-safe { background: #dcfce7 !important; }                                /* strength 12–20 jam — hijau */
.str-over { background: #fef3c7 !important; }                                /* strength > 20 jam — kuning */
.bal-deficit { background: #fecaca !important; outline: 1px solid #ef4444; } /* balance negatif — merah pekat */

/* PLAN PRODUKSI coloring */
.has-plan { background: #ECFEFF !important; }   /* cell yang ada rencana produksi — cyan muda */

/* priority: rolling > workday */
.str-crit.pc-off, .str-safe.pc-off, .str-over.pc-off { background: unset !important; }
.str-crit { background: #fee2e2 !important; }
.str-safe { background: #dcfce7 !important; }
.str-over { background: #fef3c7 !important; }

/* nilai teks per row */
.pm-balance   .pt-val { color: #374151; }
.pm-stock     .pt-val { color: #5b21b6; }
.pm-strength  .pt-val { color: #065f46; }
.pm-plan .pt-val      { color: #0E7490; font-weight: 700; }   /* PLAN PRODUKSI — cyan bold */
.has-plan .pt-val     { color: #0E7490 !important; font-weight: 700; }
.bal-deficit  .pt-val { color: #dc2626 !important; font-weight: 700; }
.str-crit     .pt-val { color: #b91c1c !important; font-weight: 700; }
.str-safe     .pt-val { color: #15803d !important; }
.str-over     .pt-val { color: #92400e !important; }

/* INIT.STK cell — editable hint */
.pt-init-stock-cell { cursor: pointer; }
.pt-init-stock-cell:hover .labst-val { text-decoration: underline dotted; }

/* inline input init_stock */
.init-stock-input {
    width: 54px; padding: 1px 3px; font-size: 10px; font-family: 'Consolas', monospace;
    border: 1px solid #1D9E75; border-radius: 3px; text-align: right; outline: none;
    background: #f0fff8; color: #085041;
}

/* teks nilai */
.pt-val { font-size: 9px; font-weight: 700; line-height: 1; color: #374151; }
.pm-mdfo .pt-val  { color: #1e40af; }
.pm-dn   .pt-val  { color: #15803d; }
.pc-off      .pt-val { color: #aaa; }
.pc-mismatch .pt-val { color: #ea580c; }

/* separator row antar part */
.pt-sep-row td { height: 4px; background: #dde4f0; padding: 0; border: none; }

/* misc */
.pt-center { text-align: center !important; }
.pt-right  { text-align: right !important; }
.pt-mono   { font-family: 'Consolas', monospace; font-size: 10.5px; }
.pt-part   { font-size: 10.5px; }

/* ── tab badge ── */
.tab-badge {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 5px; margin-left: 5px;
    border-radius: 999px; background: #FBBF24; color: #78350F;
    font-size: 10px; font-weight: 700; line-height: 1;
}
.tab-active .tab-badge { background: #F59E0B; color: #451A03; }

/* ── belum terdaftar section ── */
.unreg-section { display: flex; flex-direction: column; gap: 0; }

.unreg-banner {
    display: flex; align-items: flex-start; gap: 8px;
    padding: 10px 16px; background: #FFFBEB; border-bottom: 1px solid #FDE68A;
    font-size: 12px; color: #78350F; line-height: 1.5;
}
.unreg-banner-icon { color: #F59E0B; font-size: 15px; flex-shrink: 0; margin-top: 1px; }
.unreg-banner strong { color: #451A03; }

.unreg-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px; border-bottom: 0.5px solid #f0f0ee; flex-wrap: wrap; gap: 8px;
}
.unreg-stats { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.unreg-stat  { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.unreg-stat-val { font-size: 22px; font-weight: 600; color: #1a1a1a; line-height: 1; }
.unreg-stat-lbl { font-size: 10px; color: #888; white-space: nowrap; }

.btn-export-csv {
    display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500;
    padding: 7px 14px; border-radius: 8px; border: 1px solid #d0d0cc;
    background: #fff; color: #1a1a1a; cursor: pointer; transition: background 0.15s;
    white-space: nowrap;
}
.btn-export-csv:hover { background: #EAF3DE; border-color: #97C459; color: #3B6D11; }

.unreg-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 48px 16px; color: #888; font-size: 13px; text-align: center; gap: 4px;
}

.unreg-table-wrap { overflow-x: auto; }
.unreg-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.unreg-table thead th {
    background: linear-gradient(180deg, #78350F 0%, #5C2A0C 100%);
    color: #FEF3C7; font-size: 10px; font-weight: 600; padding: 7px 10px; text-align: center;
    border-right: 0.5px solid rgba(255,255,255,0.1); white-space: nowrap; position: sticky; top: 0;
}
.unreg-row td { padding: 7px 10px; border-bottom: 0.5px solid #fef3c7; color: #1a1a1a; vertical-align: middle; white-space: nowrap; }
.unreg-row:last-child td { border-bottom: none; }
.unreg-row:hover td { background: #FFFBEB; }
.ur-center  { text-align: center !important; }
.ur-right   { text-align: right !important; }
.ur-muted   { color: #bbb; font-size: 10px; }
.ur-mono    { font-family: 'Consolas', monospace; font-size: 10.5px; }
.ur-name    { max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
.ur-process { font-size: 10.5px; color: #555; }

.ur-tipe      { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: #f0f0ee; color: #555; }
.ur-tipe-weld { background: #FEF9C3 !important; color: #92400E !important; font-weight: 600; }

.tag-dn   { background: #DCFCE7; color: #15803D; }
.tag-nodn { background: #F3F4F6; color: #9CA3AF; }

/* ── responsive ── */
@media (max-width: 1200px) {
    .metrics-row  { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 1000px) {
    .steps-grid   { grid-template-columns: 1fr; }
    .metrics-row  { grid-template-columns: repeat(4, 1fr); }
    .summary-grid { grid-template-columns: repeat(3, 1fr); }
    .step5-body   { flex-direction: column; }
    .step5-left   { flex: none; }
}
@media (max-width: 600px) {
    .page         { padding: 16px; }
    .metrics-row  { grid-template-columns: repeat(2, 1fr); }
    .summary-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
