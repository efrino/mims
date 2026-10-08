<!-- views/admin/PCD/Welding/glc-uji-skema.vue
     Uji Skema GLC Sub Assy Robot Spot.

     Alur: DRAFT -> review robot satu per satu -> ACCEPTED -> TERBIT jadi
     versi GLC baru. Periode lama tidak pernah ditimpa.

     Skema hitungnya:
     - CT dibentuk dari fisika proses las: waktu gun per spot (stroke +
       slope + welding time) ditambah moving robot. Robot selalu pulang ke
       home position, jadi n spot butuh n+1 gerakan.
     - Penjadwalan PER KOMBINASI, bukan per OP. Satu tandem = satu rentang
       waktu. Dandori awal terpakai lagi tiap kali rangkaian mulai dari nol,
       yaitu di awal shift dan sesudah tiap istirahat.
     - Robot tidak memulai siklus yang tidak akan selesai sebelum istirahat;
       sisa menitnya tercatat sebagai "diam".

     Backend: majsf_rest_api/api/glcuji -->
<template>
  <div class="uji-root">
    <!-- ============ header ============ -->
    <v-card class="hdr-card mb-4" elevation="0">
      <div class="hdr">
        <div class="hdr-left">
          <div class="hdr-icon"><v-icon size="26">mdi-flask-outline</v-icon></div>
          <div>
            <h1>Uji Skema GLC</h1>
            <p>Sub Assy Robot Spot — coba skema, review per robot, lalu terbitkan jadi versi GLC</p>
          </div>
        </div>

        <div class="hdr-right">
          <v-select
            v-model="ujiId" :items="ujiItems" item-title="label" item-value="id"
            density="compact" variant="outlined" hide-details label="Skenario"
            style="min-width:280px" @update:model-value="muatDetail" />
          <v-btn variant="tonal" :loading="busy" prepend-icon="mdi-refresh" @click="muatDetail">
            Muat
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="dlgBaru = true">
            Skenario baru
          </v-btn>
        </div>
      </div>
    </v-card>

    <v-alert v-if="pesan" :type="pesanOk ? 'success' : 'error'" variant="tonal"
             class="mb-4" closable @click:close="pesan = ''">
      {{ pesan }}
    </v-alert>

    <template v-if="header">
      <!-- ============ alur status ============ -->
      <v-card class="mb-4 pa-4" elevation="0" border>
        <div class="alur">
          <motion.div v-for="(s, i) in langkah" :key="s.key" class="alur-step"
                      :class="{ aktif: s.aktif, lewat: s.lewat }"
                      :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
                      :transition="{ delay: i * 0.06, duration: 0.3 }">
            <div class="alur-bulat">
              <v-icon size="18">{{ s.lewat ? 'mdi-check' : s.icon }}</v-icon>
            </div>
            <div class="alur-txt">
              <strong>{{ s.judul }}</strong>
              <span>{{ s.ket }}</span>
            </div>
            <div v-if="i < langkah.length - 1" class="alur-garis" />
          </motion.div>
        </div>

        <div class="alur-aksi">
          <v-chip :color="warnaStatus(header.status)" variant="flat" size="small" class="mr-2">
            {{ header.status }}
          </v-chip>
          <span class="alur-info">
            {{ header.robot_direview }} dari {{ header.robot_total }} robot sudah OK
            <template v-if="header.robot_revisi > 0">
              · <strong class="txt-bad">{{ header.robot_revisi }} minta revisi</strong>
            </template>
          </span>
          <v-spacer />
          <v-btn v-if="bisaHitung" variant="tonal" :loading="busy"
                 prepend-icon="mdi-calculator-variant-outline" @click="hitung">
            Hitung ulang
          </v-btn>
          <v-btn v-if="header.status !== 'ACCEPTED' && header.status !== 'TERBIT'"
                 color="success" :disabled="!siapAccept" :loading="busy"
                 prepend-icon="mdi-check-decagram-outline" @click="accept">
            Accept
          </v-btn>
          <v-btn v-if="header.status === 'ACCEPTED'" variant="tonal" :loading="busy"
                 prepend-icon="mdi-undo" @click="batal">Batalkan accept</v-btn>
          <v-btn v-if="header.status === 'ACCEPTED'" color="primary" :loading="busy"
                 prepend-icon="mdi-publish" @click="terbit">
            Terbitkan jadi versi GLC
          </v-btn>
          <template v-if="header.status === 'TERBIT'">
            <v-chip color="primary" variant="flat" size="small">
              <v-icon start size="16">mdi-check-all</v-icon>
              Terbit sebagai GLC #{{ header.glc_id }}
            </v-chip>
            <v-btn variant="tonal" color="warning" :loading="busy"
                   prepend-icon="mdi-backup-restore" @click="dlgTarik = true">
              Tarik kembali
            </v-btn>
          </template>
          <v-btn v-if="header.status === 'TERBIT' || header.status === 'ACCEPTED'"
                 variant="text" :loading="busy" prepend-icon="mdi-content-duplicate"
                 @click="revisi">Buat revisi</v-btn>
        </div>

        <div v-if="bisaHitung" class="setelan-skenario">
          <span class="ss-judul">Setelan skenario</span>
          <v-btn-toggle :model-value="header.mode_beban" density="compact" variant="outlined"
                        divided mandatory @update:model-value="ubahSetelan('mode_beban', $event)">
            <v-btn value="PER SHIFT">Per shift</v-btn>
            <v-btn value="1 HARI">1 hari</v-btn>
          </v-btn-toggle>
          <v-btn-toggle :model-value="header.shift" density="compact" variant="outlined"
                        divided mandatory @update:model-value="ubahSetelan('shift', $event)">
            <v-btn value="DAY">Day</v-btn>
            <v-btn value="NIGHT">Night</v-btn>
          </v-btn-toggle>
          <v-btn-toggle :model-value="header.sumber_ct" density="compact" variant="outlined"
                        divided mandatory @update:model-value="ubahSetelan('sumber_ct', $event)">
            <v-btn value="HITUNG">CT hitung</v-btn>
            <v-btn value="MASTER">CT master</v-btn>
          </v-btn-toggle>
          <span class="ss-ket">
            Mode <strong>per shift</strong> membagi beban harian dengan jumlah shift robot itu;
            <strong>1 hari</strong> memakai beban penuh. Mengubahnya langsung menghitung ulang.
          </span>
        </div>

        <p v-if="header.status === 'TERBIT'" class="terbit-info">
          <v-icon size="15">mdi-information-outline</v-icon>
          Hasilnya sudah masuk ke halaman <strong>GLC Robot Sub Assy</strong> sebagai versi baru
          periode {{ header.periode }} — pilih periodenya di sana untuk melihat pattern dan
          loading capacity-nya. Versi lama tetap utuh.
          <router-link to="/Transaction/welding/glc-robot">Buka halaman GLC</router-link>
        </p>
      </v-card>

      <!-- ============ kartu angka ============ -->
      <div class="kpi-grid mb-4">
        <motion.div v-for="(k, i) in kpi" :key="k.label" class="kpi"
                    :class="k.nada" :initial="{ opacity: 0, y: 12 }"
                    :animate="{ opacity: 1, y: 0 }"
                    :transition="{ delay: 0.05 + i * 0.05, duration: 0.35 }">
          <div class="kpi-ikon"><v-icon size="20">{{ k.icon }}</v-icon></div>
          <div class="kpi-isi">
            <span class="kpi-nilai">{{ k.nilai }}</span>
            <span class="kpi-label">{{ k.label }}</span>
            <span v-if="k.sub" class="kpi-sub">{{ k.sub }}</span>
          </div>
        </motion.div>
      </div>

      <v-tabs v-model="tab" class="mb-3" density="comfortable">
        <v-tab value="robot"><v-icon start size="18">mdi-robot-industrial</v-icon>Robot &amp; review</v-tab>
        <v-tab value="pattern"><v-icon start size="18">mdi-view-grid-outline</v-icon>Pattern A/B/C/D</v-tab>
        <v-tab value="jadwal"><v-icon start size="18">mdi-calendar-week</v-icon>Jadwal &amp; recovery</v-tab>
        <v-tab value="uph"><v-icon start size="18">mdi-speedometer</v-icon>UPH part</v-tab>
        <v-tab value="komb"><v-icon start size="18">mdi-vector-link</v-icon>Kombinasi &amp; dandori</v-tab>
        <v-tab value="tskk"><v-icon start size="18">mdi-table-clock</v-icon>TSKK</v-tab>
        <v-tab value="shift"><v-icon start size="18">mdi-calendar-clock</v-icon>Shift robot</v-tab>
        <v-tab value="param"><v-icon start size="18">mdi-tune-variant</v-icon>Parameter CT</v-tab>
        <v-tab value="riwayat"><v-icon start size="18">mdi-history</v-icon>Riwayat</v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <!-- ================= TAB ROBOT ================= -->
        <v-window-item value="robot">
          <div class="dua-kolom">
            <!-- daftar robot -->
            <v-card elevation="0" border class="pa-0">
              <div class="panel-hdr">
                <strong>Robot</strong>
                <v-chip size="x-small" variant="tonal">{{ robot.length }}</v-chip>
              </div>
              <div class="robot-list">
                <button v-for="r in robot" :key="r.machine" class="robot-item"
                        :class="{ pilih: mesin === r.machine }" @click="pilihMesin(r.machine)">
                  <span class="rv-dot" :class="'rv-' + r.status_review.toLowerCase()" />
                  <span class="ri-nama">{{ r.machine }}</span>
                  <span class="ri-jam">{{ jamPendek(r.jam_selesai) }}</span>
                  <v-icon v-if="num(r.lewat_shift)" size="14" color="#d03b3b"
                          title="rentang melewati blok shift">mdi-alert-circle</v-icon>
                </button>
              </div>
            </v-card>

            <!-- detail robot -->
            <div>
              <v-card v-if="mesinRow" elevation="0" border class="pa-4 mb-4">
                <div class="det-hdr">
                  <div>
                    <h2>{{ mesinRow.machine }}</h2>
                    <p>
                      {{ mesinRow.kombinasi_n }} kombinasi ·
                      {{ jamPendek(mesinRow.jam_mulai) }}–{{ jamPendek(mesinRow.jam_selesai) }} ·
                      <strong>{{ n1(jamAktif) }} jam kerja</strong>
                      <template v-if="Number(mesinRow.blok_shift) > 0">
                        dari blok {{ n1(mesinRow.blok_shift) }} jam
                      </template>
                      <span class="txt-lemah">
                        (selesai {{ n1(mesinRow.rentang_jam) }} jam sesudah masuk,
                        termasuk {{ n0(mesinRow.jeda_menit) }} mnt istirahat)
                      </span>
                    </p>
                  </div>
                  <v-chip v-if="num(mesinRow.lewat_shift)" color="#d03b3b" variant="flat" size="small">
                    <v-icon start size="15">mdi-alert</v-icon>lewat blok shift
                  </v-chip>
                </div>

                <div class="det-angka">
                  <div><span>{{ n1(mesinRow.beban_menit) }}</span>beban (mnt)</div>
                  <div><span>{{ mesinRow.berhenti_kali }}</span>berhenti</div>
                  <div><span>{{ n0(mesinRow.jeda_menit) }}</span>jeda (mnt)</div>
                  <div class="nada-warn"><span>{{ n1(mesinRow.diam_menit) }}</span>diam (mnt)</div>
                  <div><span>{{ n1(mesinRow.dandori_ulang_dtk) }}</span>dandori ulang (dtk)</div>
                </div>

                <!-- review -->
                <div class="review-bar" :class="'rb-' + mesinRow.status_review.toLowerCase()">
                  <v-icon size="18">{{ ikonReview(mesinRow.status_review) }}</v-icon>
                  <span class="rb-txt">
                    <template v-if="mesinRow.status_review === 'BELUM'">Robot ini belum direview</template>
                    <template v-else-if="mesinRow.status_review === 'OK'">
                      Disetujui{{ mesinRow.reviewed_by ? ' oleh ' + mesinRow.reviewed_by : '' }}
                    </template>
                    <template v-else>Minta revisi{{ mesinRow.catatan ? ': ' + mesinRow.catatan : '' }}</template>
                  </span>
                  <v-spacer />
                  <template v-if="bisaReview">
                    <v-btn size="small" variant="tonal" color="success" :loading="busy"
                           prepend-icon="mdi-check" @click="review('OK')">Setujui</v-btn>
                    <v-btn size="small" variant="tonal" color="warning" :loading="busy"
                           prepend-icon="mdi-comment-alert-outline" @click="dlgRevisi = true">Revisi</v-btn>
                    <v-btn v-if="mesinRow.status_review !== 'BELUM'" size="small" variant="text"
                           :loading="busy" @click="review('BELUM')">Reset</v-btn>
                  </template>
                </div>
              </v-card>

              <!-- linimasa -->
              <v-card elevation="0" border class="pa-4 mb-4">
                <div class="chart-hdr">
                  <div>
                    <strong>Linimasa kerja {{ mesin }}</strong>
                    <span>Tiap kombinasi satu baris. Robot berhenti di batas siklus CT sebelum
                      istirahat, jadi ada menit "diam" yang tidak terpakai.</span>
                  </div>
                </div>
                <apexchart v-if="timelineSeries.length" type="rangeBar"
                           :height="Math.max(180, 46 * kombinasi.length + 90)"
                           :options="timelineOpt" :series="timelineSeries" />
                <p v-else class="kosong">Belum ada data linimasa.</p>
              </v-card>

              <!-- tabel kombinasi -->
              <v-card elevation="0" border class="pa-0">
                <div class="panel-hdr"><strong>Kombinasi</strong></div>
                <v-table density="compact" class="tabel">
                  <thead>
                    <tr>
                      <th>Kombinasi</th><th>Isi</th>
                      <th class="ka">CT/siklus<br /><small>dtk</small></th>
                      <th class="ka">Dandori<br /><small>dtk</small></th>
                      <th class="ka">Beban<br /><small>mnt</small></th>
                      <th class="ka">Pcs/<br />siklus</th>
                      <th class="ka">UPH<br />tandem</th>
                      <th class="tg">Mulai</th><th class="tg">Selesai</th>
                      <th class="ka">Stop</th>
                      <th class="ka">Diam<br /><small>mnt</small></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="k in kombinasi" :key="k.id">
                      <td class="tebal">
                        {{ k.kombinasi }}
                        <span v-if="k.kombinasi === k.isi" class="tag-nolabel">tanpa label</span>
                      </td>
                      <td class="isi">{{ k.kombinasi === k.isi ? '—' : k.isi }}</td>
                      <td class="ka">{{ n1(k.ct_siklus_dtk) }}</td>
                      <td class="ka">{{ n1(k.dandori_awal_dtk) }}</td>
                      <td class="ka">{{ n1(k.beban_menit) }}</td>
                      <td class="ka">
                        <v-chip v-if="k.pcs_siklus > 1" size="x-small" color="#1baf7a" variant="flat">
                          {{ k.pcs_siklus }}
                        </v-chip>
                        <span v-else>1</span>
                      </td>
                      <td class="ka tebal">{{ n1(k.uph_tandem) }}</td>
                      <td class="tg">{{ jamPendek(k.jam_mulai) }}</td>
                      <td class="tg">{{ jamPendek(k.jam_selesai) }}</td>
                      <td class="ka">{{ k.berhenti_kali }}</td>
                      <td class="ka" :class="{ 'txt-warn': Number(k.diam_menit) > 0 }">
                        {{ n1(k.diam_menit) }}
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card>

              <!-- rincian segmen -->
              <v-card elevation="0" border class="pa-4 mt-4">
                <div class="panel-hdr px-0"><strong>Rincian berhenti &amp; lanjut</strong></div>
                <div v-for="(grp, nama) in segmenPerKombinasi" :key="nama" class="seg-grup">
                  <div class="seg-judul">{{ nama }}</div>
                  <div class="seg-alur">
                    <template v-for="s in grp" :key="s.id">
                      <span class="seg-kerja">
                        {{ jamPendek(s.jam_mulai) }}–{{ jamPendek(s.jam_selesai) }}
                        <small>{{ n1(s.kerja_menit) }} mnt</small>
                      </span>
                      <span v-if="s.istirahat_jam" class="seg-brk">
                        <v-icon size="13">mdi-coffee-outline</v-icon>
                        {{ jamPendek(s.istirahat_jam) }} · {{ s.istirahat_menit }} mnt
                        <em v-if="Number(s.diam_menit) > 0">diam {{ n1(s.diam_menit) }}</em>
                      </span>
                    </template>
                  </div>
                </div>
              </v-card>
            </div>
          </div>
        </v-window-item>

        <!-- ================= TAB UPH ================= -->
        <!-- ================= TAB PATTERN A/B/C/D ================= -->
        <v-window-item value="pattern">
          <v-card elevation="0" border class="pa-4">
            <div class="chart-hdr">
              <div>
                <strong>Skema produksi pattern A/B/C/D</strong>
                <span>
                  Urutan job dalam satu shift per robot. Dari sinilah keluarannya diadu dengan
                  target delivery, safety stock, dan UPH.
                </span>
              </div>
            </div>
            <PatternAbcd v-if="header?.glc_id_sumber" :glc-id="Number(header.glc_id_sumber)" />
            <p v-else class="hint">Pilih skenario dulu supaya periode GLC sumbernya diketahui.</p>
          </v-card>
        </v-window-item>


        <!-- ================= TAB JADWAL & RECOVERY ================= -->
        <v-window-item value="jadwal">
          <v-card elevation="0" border class="pa-4">
            <div class="chart-hdr">
              <div>
                <strong>Jadwal part per minggu dan recovery akhir pekan</strong>
                <span>
                  Kapan tiap part dibuat, dari W1 sampai minggu terakhir bulan berjalan,
                  dan apa rencananya kalau beban satu hari tidak muat di blok jam kerja.
                </span>
              </div>
            </div>
            <JadwalMingguan v-if="header?.glc_id_sumber" :glc-id="Number(header.glc_id_sumber)" />
            <p v-else class="hint">Pilih skenario dulu supaya periode GLC sumbernya diketahui.</p>
          </v-card>
        </v-window-item>
        <v-window-item value="uph">
          <div class="uph-atas mb-4">
            <v-card elevation="0" border class="pa-4">
              <div class="chart-hdr">
                <div>
                  <strong>Status terhadap target {{ n0(header.target_uph) }} pcs/jam</strong>
                  <span>Dihitung dari UPH unit, yaitu 3600 dibagi jumlah CT seluruh rute part.</span>
                </div>
              </div>
              <apexchart type="donut" height="260" :options="donutOpt" :series="donutSeries" />
            </v-card>

            <v-card elevation="0" border class="pa-4">
              <div class="chart-hdr">
                <div>
                  <strong>20 part terjauh dari target</strong>
                  <span>UPH unit = satu unit dikerjakan berurutan dari WIP sampai finish.
                    UPH bottleneck = kapasitas rute kalau tiap OP jalan paralel di stasiunnya.</span>
                </div>
              </div>
              <apexchart type="bar" height="520" :options="uphOpt" :series="uphSeries" />
            </v-card>
          </div>

          <v-card elevation="0" border class="pa-0">
            <div class="panel-hdr">
              <strong>Semua part</strong>
              <v-spacer />
              <v-btn-toggle v-model="filterStatus" density="compact" variant="outlined"
                            divided mandatory>
                <v-btn value="">Semua</v-btn>
                <v-btn value="LOLOS">Lolos</v-btn>
                <v-btn value="SPM">SPM</v-btn>
                <v-btn value="PECAH OP">Pecah OP</v-btn>
                <v-btn value="MUSTAHIL">Mustahil</v-btn>
              </v-btn-toggle>
            </div>
            <v-table density="compact" class="tabel">
              <thead>
                <tr>
                  <th>Part number</th><th>Rute</th>
                  <th class="ka">Robot</th><th class="ka">Ʃ spot</th>
                  <th class="ka">Proses<br /><small>dtk</small></th>
                  <th class="ka">Pindah WIP<br /><small>kali</small></th>
                  <th class="ka">Ʃ CT rute<br /><small>dtk</small></th>
                  <th class="ka">UPH unit</th><th class="ka">UPH bottleneck</th>
                  <th class="tg">Status</th><th>Yang harus dilakukan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in partTampil" :key="p.id">
                  <td class="tebal">{{ p.part_number }}</td>
                  <td>{{ p.rute }}</td>
                  <td class="ka">
                    <v-tooltip v-if="p.robot_n > 1" :text="p.robot_list || ''" location="top">
                      <template #activator="{ props }">
                        <v-chip v-bind="props" size="x-small" color="#eb6834" variant="flat">
                          {{ p.robot_n }}
                        </v-chip>
                      </template>
                    </v-tooltip>
                    <span v-else>{{ p.robot_n }}</span>
                  </td>
                  <td class="ka">{{ p.spot_total }}</td>
                  <td class="ka">{{ n1(p.ct_proses_dtk) }}</td>
                  <td class="ka">
                    <small v-if="p.pindah_n > 0" class="txt-lemah">{{ p.pindah_n }}x</small>
                    <span v-else>&mdash;</span>
                  </td>
                  <td class="ka">{{ n1(p.ct_rute_dtk) }}</td>
                  <td class="ka tebal">{{ n1(p.uph_unit) }}</td>
                  <td class="ka">{{ n1(p.uph_bottleneck) }}</td>
                  <td class="tg">
                    <v-chip size="x-small" variant="flat" :color="warnaTarget(p.status_target)">
                      <v-icon start size="13">{{ ikonTarget(p.status_target) }}</v-icon>
                      {{ p.status_target }}
                    </v-chip>
                  </td>
                  <td class="saran">{{ p.saran }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </v-window-item>

        <!-- ================= TAB KOMBINASI ================= -->
        <v-window-item value="komb">
          <v-card elevation="0" border class="pa-4 mb-4">
            <div class="chart-hdr">
              <div>
                <strong>Kombinasi &amp; dandori awal</strong>
                <span>
                  Beri label yang <em>sama</em> untuk OP yang dirangkai — baik tandem antar jig
                  maupun aliran OP10 → OP20 pada part yang sama. Dandori awal diisi
                  <strong>hanya di OP yang pertama diproses</strong> dalam tiap kombinasi;
                  anggota berikutnya 0, karena WIP-nya sudah terpasang dan handling
                  berikutnya berjalan paralel dengan proses robot.
                </span>
              </div>
            </div>

            <div class="komb-bar">
              <v-select v-model="kombMesin" :items="daftarRobot" item-title="label"
                        item-value="machine" label="Robot" density="compact"
                        variant="outlined" hide-details style="max-width:240px"
                        @update:model-value="muatKombEdit" />
              <v-chip size="small" variant="tonal">{{ kombEdit.length }} OP</v-chip>
              <v-chip size="small" :color="kombGrup.length ? '#1baf7a' : undefined" variant="tonal">
                {{ kombGrup.length }} kombinasi
              </v-chip>
              <v-spacer />
              <v-btn variant="text" prepend-icon="mdi-auto-fix" @click="isiOtomatis">
                Isi otomatis per part
              </v-btn>
              <v-btn color="primary" :loading="busy" prepend-icon="mdi-content-save-outline"
                     @click="simpanKomb">Simpan</v-btn>
            </div>

            <v-alert v-if="peringatanKomb.length" type="warning" variant="tonal"
                     density="compact" class="mb-3">
              <div v-for="w in peringatanKomb" :key="w">{{ w }}</div>
            </v-alert>

            <v-table density="compact" class="tabel">
              <thead>
                <tr>
                  <th>Part number</th><th class="tg">OP</th><th class="tg">Jig</th>
                  <th class="ka">Spot</th><th class="ka">Kanban</th>
                  <th style="width:170px">Kombinasi</th>
                  <th style="width:160px">TSKK<br /><small>wajib bila beda part</small></th>
                  <th class="ka" style="width:130px">Dandori awal<br /><small>dtk/shift</small></th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in kombEdit" :key="r.part_number + '|' + r.op"
                    :class="{ 'baris-grup': r.kombinasi }">
                  <td class="tebal">{{ r.part_number }}</td>
                  <td class="tg">{{ r.op || '-' }}</td>
                  <td class="tg">{{ r.jig || '-' }}</td>
                  <td class="ka">{{ r.spot }}</td>
                  <td class="ka">{{ r.qty_kanban }}</td>
                  <td>
                    <input v-model="r.kombinasi" class="sel-komb" list="daftar-komb"
                           placeholder="(sendiri)" />
                  </td>
                  <td>
                    <input v-model="r.tskk_no" class="inp-ket"
                           :class="{ 'perlu-tskk': perluTskk(r) }"
                           :placeholder="perluTskk(r) ? 'no. TSKK wajib' : 'no. TSKK'" />
                  </td>
                  <td class="ka">
                    <input v-model.number="r.dandori_awal_dtk" type="number" step="0.5"
                           class="inp-dand" :class="{ redup: !bolehDandori(i) }" />
                  </td>
                  <td>
                    <input v-model="r.keterangan" class="inp-ket" placeholder="opsional" />
                  </td>
                </tr>
              </tbody>
            </v-table>
            <datalist id="daftar-komb">
              <option v-for="g in kombGrup" :key="g" :value="g" />
              <option value="TANDEM-1" /><option value="TANDEM-2" /><option value="TANDEM-3" />
            </datalist>

            <p class="hint mt-3">
              Setelah disimpan, jalankan <strong>Hitung ulang</strong> pada skenario DRAFT agar
              penjadwalannya memakai kombinasi yang baru. Skenario yang sudah ACCEPTED atau
              TERBIT tidak ikut berubah.
            </p>
          </v-card>
        </v-window-item>

        <!-- ================= TAB TSKK ================= -->
        <v-window-item value="tskk">
          <v-card elevation="0" border class="pa-4 mb-4">
            <div class="chart-hdr">
              <div>
                <strong>TSKK — Tabel Standar Kerja Kombinasi</strong>
                <span>
                  Langkah kerja kombinasi diketik di sini, bukan diambil dari berkas TSKK lama.
                  Waktu siklusnya dihitung dari langkah-langkah itu: seluruh proses robot (AUTO)
                  dijumlahkan karena robot cuma bisa mengerjakan satu jig pada satu waktu,
                  sedangkan pekerjaan operator yang ditandai <strong>paralel</strong> berjalan
                  di balik proses robot sehingga tidak menambah siklus.
                  Kombinasi yang punya TSKK berstatus <strong>AKTIF</strong> memakai siklus ini
                  sebagai CT, menggantikan hitungan dari jumlah spot.
                </span>
              </div>
            </div>

            <div class="komb-bar">
              <v-select v-model="tskkMesin" :items="daftarRobot" item-title="label"
                        item-value="machine" label="Robot" density="compact" variant="outlined"
                        hide-details style="max-width:230px" @update:model-value="muatTskkList" />
              <v-select v-model="tskkId" :items="tskkItems" item-title="label" item-value="id"
                        label="Dokumen TSKK" density="compact" variant="outlined" hide-details
                        style="max-width:300px" @update:model-value="bukaTskk" />
              <v-btn variant="tonal" prepend-icon="mdi-plus" @click="tskkBaru">Baru</v-btn>
              <v-btn v-if="tskk.id" variant="text" prepend-icon="mdi-content-copy"
                     :loading="busy" @click="tskkSalin">Salin jadi revisi</v-btn>
              <v-spacer />
              <v-chip size="small" :color="tskk.status === 'AKTIF' ? '#0ca30c' : undefined"
                      variant="flat" v-if="tskk.status === 'AKTIF'">AKTIF</v-chip>
              <v-btn color="primary" :loading="busy" prepend-icon="mdi-content-save-outline"
                     @click="tskkSimpan">Simpan TSKK</v-btn>
            </div>

            <!-- identitas, tata letaknya mengikuti kepala formulir TSKK -->
            <div class="tskk-kepala">
              <label>No. dokumen<input v-model="tskk.no_dokumen" placeholder="TSKK/RSW../2026-.." /></label>
              <label>Tanggal<input v-model="tskk.tanggal" type="date" /></label>
              <label>Revisi<input v-model="tskk.revisi" placeholder="0" /></label>
              <label>Kombinasi<input v-model="tskk.kombinasi" placeholder="TANDEM-1" /></label>
              <label>Part No.<input v-model="tskk.part_no" placeholder="boleh beberapa, pisah koma" /></label>
              <label>Part Name<input v-model="tskk.part_name" /></label>
              <label>Process<input v-model="tskk.proses" placeholder="Robot 06" /></label>
              <label>Dibuat oleh<input v-model="tskk.dibuat_oleh" /></label>
              <label>Disetujui oleh<input v-model="tskk.disetujui_oleh" /></label>
              <label>Status
                <select v-model="tskk.status">
                  <option>DRAFT</option><option>AKTIF</option><option>USANG</option>
                </select>
              </label>
            </div>

            <!-- ringkasan siklus -->
            <div class="tskk-ring">
              <div><span>{{ n1(ringTskk.auto) }}</span>AUTO robot (dtk)</div>
              <div><span>{{ n1(ringTskk.manual) }}</span>operator menahan (dtk)</div>
              <div class="nada-ok"><span>{{ n1(ringTskk.paralel) }}</span>paralel, tidak menambah</div>
              <div class="utama"><span>{{ n1(ringTskk.siklus) }}</span>SIKLUS (dtk)</div>
              <div><span>{{ ringTskk.siklus > 0 ? n1(3600 / ringTskk.siklus) : '-' }}</span>siklus/jam</div>
            </div>

            <!-- diagram waktu, ciri khas TSKK -->
            <div class="tskk-diagram" v-if="petaLangkah.length">
              <div class="td-judul">Diagram kerja kombinasi</div>
              <div v-for="p in petaLangkah" :key="p.i" class="td-baris">
                <div class="td-nama">
                  <span class="td-no">{{ p.i + 1 }}</span>{{ p.uraian || '(belum diisi)' }}
                </div>
                <div class="td-jalur">
                  <div class="td-bar" :class="'tb-' + p.jenis.toLowerCase() + (p.paralel ? ' tb-par' : '')"
                       :style="{ left: p.kiri + '%', width: p.lebar + '%' }"
                       :title="`${p.jenis} ${p.waktu} dtk`">
                    <span v-if="p.lebar > 7">{{ p.waktu }}s</span>
                  </div>
                </div>
              </div>
              <div class="td-skala">
                <span v-for="t in skalaTskk" :key="t">{{ t }}s</span>
              </div>
              <div class="td-legenda">
                <span class="lg lg-auto">AUTO robot</span>
                <span class="lg lg-manual">operator menahan</span>
                <span class="lg lg-par">operator paralel</span>
                <span class="lg lg-tunggu">tunggu</span>
              </div>
            </div>

            <!-- langkah kerja -->
            <v-table density="compact" class="tabel mt-3">
              <thead>
                <tr>
                  <th style="width:40px">No</th>
                  <th style="width:70px">Jig</th>
                  <th>Uraian pekerjaan</th>
                  <th style="width:110px">Jenis</th>
                  <th class="ka" style="width:90px">Waktu<br /><small>dtk</small></th>
                  <th class="tg" style="width:80px">Paralel</th>
                  <th>Keterangan</th>
                  <th style="width:70px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(l, i) in tskkLangkah" :key="i">
                  <td class="tg">{{ i + 1 }}</td>
                  <td><input v-model="l.jig" class="inp-kecil" placeholder="J1" /></td>
                  <td><input v-model="l.uraian" class="inp-ket" placeholder="mis. Pasang WIP ke jig 1" /></td>
                  <td>
                    <select v-model="l.jenis" class="inp-kecil lebar">
                      <option>MANUAL</option><option>AUTO</option>
                      <option>JALAN</option><option>TUNGGU</option>
                    </select>
                  </td>
                  <td class="ka">
                    <input v-model.number="l.waktu_detik" type="number" step="0.5" class="inp-dand" />
                  </td>
                  <td class="tg">
                    <input type="checkbox" :checked="l.paralel === 1"
                           :disabled="l.jenis === 'AUTO' || l.jenis === 'TUNGGU'"
                           @change="l.paralel = ($event.target as HTMLInputElement).checked ? 1 : 0" />
                  </td>
                  <td><input v-model="l.keterangan" class="inp-ket" placeholder="opsional" /></td>
                  <td class="tg">
                    <v-btn size="x-small" variant="text" icon="mdi-arrow-up" @click="geserLangkah(i, -1)" />
                    <v-btn size="x-small" variant="text" icon="mdi-close" @click="hapusLangkah(i)" />
                  </td>
                </tr>
              </tbody>
            </v-table>
            <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" class="mt-2"
                   @click="tambahLangkah">Tambah langkah</v-btn>

            <p class="hint mt-3">
              Prosedur pengisian: urutkan langkah persis seperti yang dikerjakan operator dari
              ambil part finish, pasang WIP, tekan tombol, sampai proses robot selesai.
              Beri tanda <strong>paralel</strong> pada pekerjaan yang memang dilakukan
              <em>selagi robot mengelas jig lain</em> — itulah inti tandem. Langkah
              <strong>AUTO</strong> adalah waktu robot mengelas, dan <strong>TUNGGU</strong>
              dipakai kalau robot terpaksa berhenti menunggu operator.
              Setelah statusnya AKTIF, jalankan Hitung ulang agar CT kombinasinya memakai siklus ini.
            </p>
          </v-card>
        </v-window-item>

        <!-- ================= TAB SHIFT ROBOT ================= -->
        <v-window-item value="shift">
          <v-card elevation="0" border class="pa-4">
            <div class="chart-hdr">
              <div>
                <strong>Jumlah shift per robot</strong>
                <span>
                  Berapa shift sebuah robot dijalankan adalah keputusan produksi, bukan akibat
                  perhitungan. Nilai awal diturunkan dari blok jam GLC, tapi bisa ditetapkan
                  sendiri di sini. Robot yang diisi <strong>0</strong> dianggap tidak berproduksi.
                  Setelan ini yang menentukan pembagi saat mode beban “per shift”.
                </span>
              </div>
            </div>
            <div class="komb-bar">
              <v-chip size="small" variant="tonal">{{ shiftRobot.length }} robot</v-chip>
              <v-chip size="small" variant="tonal">{{ cacahShift(1) }} robot 1 shift</v-chip>
              <v-chip size="small" variant="tonal">{{ cacahShift(2) }} robot 2 shift</v-chip>
              <v-chip v-if="cacahShift(0)" size="small" color="#d03b3b" variant="tonal">
                {{ cacahShift(0) }} nonaktif
              </v-chip>
              <v-spacer />
              <v-btn color="primary" :loading="busy" prepend-icon="mdi-content-save-outline"
                     @click="simpanShift">Simpan setelan shift</v-btn>
            </div>
            <div class="shift-grid">
              <div v-for="r in shiftRobot" :key="r.machine" class="shift-kartu"
                   :class="'sh-' + r.jumlah_shift">
                <div class="sk-nama">{{ r.machine }}</div>
                <v-btn-toggle v-model="r.jumlah_shift" density="compact" variant="outlined"
                              divided mandatory class="sk-pilih">
                  <v-btn :value="0">0</v-btn><v-btn :value="1">1</v-btn><v-btn :value="2">2</v-btn>
                </v-btn-toggle>
                <input v-model="r.catatan" class="sk-catatan" placeholder="catatan" />
              </div>
            </div>
            <p class="hint mt-3">
              Setelah disimpan, jalankan <strong>Hitung ulang</strong> agar beban dan jadwalnya
              memakai jumlah shift yang baru.
            </p>
          </v-card>
        </v-window-item>

        <!-- ================= TAB PARAMETER ================= -->
        <v-window-item value="param">
          <div class="dua-kolom-param">
            <v-card elevation="0" border class="pa-4">
              <div class="panel-hdr px-0"><strong>Parameter pembentuk CT</strong></div>
              <p class="hint">
                CT tidak diambil sebagai angka jadi, tapi dibentuk dari waktu gun per spot
                dan waktu perpindahan robot. Pilih dulu dasar rumusnya; isian di bawah
                mengikuti pilihan itu.
              </p>

              <label class="pilih-rumus">Dasar rumus CT
                <select v-model="paramEdit.dasar_rumus">
                  <option value="LAMA">LAMA &mdash; Ʃspot &times; waktu gun + moving 1x per OP</option>
                  <option value="RND">R&amp;D &mdash; squeeze/pulse/hold + SPM</option>
                </select>
              </label>
              <p class="hint hint-rumus">
                <template v-if="pakaiRumusLama">
                  Rumus yang dipakai produksi. Moving robot ditambahkan
                  <strong>sekali di akhir tiap baris OP</strong>, bukan tiap titik.
                </template>
                <template v-else>
                  Rumus kajian R&amp;D. Tiap titik menanggung travel, las, dan motion;
                  tiap OP ditutup satu motion pulang ke home.
                </template>
              </p>

              <div class="form-grid">
                <label>Frekuensi PLN (Hz)
                  <input type="number" step="1" v-model.number="paramEdit.freq_pln" /></label>

                <!-- ---- isian rumus lama ---- -->
                <template v-if="pakaiRumusLama">
                  <label>Waktu 1x stroke gun (dtk)
                    <input type="number" step="0.1" v-model.number="paramEdit.gun_stroke_dtk" /></label>
                  <label>Up slope (cycle)
                    <input type="number" step="1" v-model.number="paramEdit.up_slope_cycle" /></label>
                  <label>Down slope (cycle)
                    <input type="number" step="1" v-model.number="paramEdit.down_slope_cycle" /></label>
                  <label>Welding time baku (cycle)
                    <input type="number" step="1" v-model.number="paramEdit.welding_baku_cycle" /></label>
                  <label>Moving robot (dtk/OP)
                    <input type="number" step="0.1" v-model.number="paramEdit.moving_dtk" /></label>
                  <label>Faktor kecepatan robot
                    <input type="number" step="0.1" v-model.number="paramEdit.faktor_kecepatan" /></label>
                </template>

                <!-- ---- isian rumus R&D ---- -->
                <template v-else>
                  <label>Squeeze time (cycle)
                    <input type="number" step="1" v-model.number="paramEdit.squeeze_cycle" /></label>
                  <label>Jumlah pulse (N.pulse)
                    <input type="number" step="1" v-model.number="paramEdit.n_pulse" /></label>
                  <label>Welding time per pulse (cycle)
                    <input type="number" step="1" v-model.number="paramEdit.welding_cycle" /></label>
                  <label>Cool antar pulse (cycle)
                    <input type="number" step="1" v-model.number="paramEdit.cool_cycle" /></label>
                  <label>Hold time (cycle)
                    <input type="number" step="1" v-model.number="paramEdit.hold_cycle" /></label>
                  <label>SPM (stroke/menit)
                    <input type="number" step="1" v-model.number="paramEdit.spm" /></label>
                  <label>Jarak antar spot baku (mm)
                    <input type="number" step="10" v-model.number="paramEdit.jarak_spot_mm" /></label>
                  <label>Motion pulang ke home (dtk/OP)
                    <input type="number" step="0.1" v-model.number="paramEdit.pulang_home_dtk" /></label>
                </template>

                <!-- Pindah WIP dihapus: pemindahannya dikerjakan operator
                     berbarengan dengan robot yang sedang mengelas, jadi tidak
                     boleh ditambahkan berurut ke CT rute. Kalau memang memakan
                     waktu robot, TSKK yang mencatatnya. -->
                <label>Target UPH (pcs/jam)
                  <input type="number" step="1" v-model.number="paramEdit.target_uph" /></label>
              </div>
              <v-btn class="mt-3" color="primary" :loading="busy"
                     prepend-icon="mdi-content-save-outline" @click="simpanParam">
                Simpan parameter
              </v-btn>
              <p class="hint mt-2">
                Menyimpan parameter tidak mengubah skenario yang sudah ACCEPTED atau TERBIT.
                Jalankan “Hitung ulang” pada skenario DRAFT untuk memakai nilai baru.
              </p>
            </v-card>

            <v-card elevation="0" border class="pa-4">
              <div class="panel-hdr px-0"><strong>Turunannya</strong></div>
              <div class="turunan">
                <div class="tr-baris">
                  <span>1 cycle</span><strong>{{ n3(1 / (paramEdit.freq_pln || 50)) }} dtk</strong>
                </div>
                <div class="tr-baris">
                  <span v-if="pakaiRumusLama">Waktu las (up + down slope + welding baku)</span>
                  <span v-else>T.las (squeeze + N&times;weld + cool + hold)</span>
                  <strong>{{ n2(tLas) }} dtk</strong>
                </div>
                <div class="tr-baris">
                  <span v-if="pakaiRumusLama">Stroke gun</span>
                  <span v-else>T.travel (60 / SPM)</span>
                  <strong>{{ n2(tTravel) }} dtk</strong>
                </div>
                <div class="tr-baris" v-if="!pakaiRumusLama">
                  <span>T.motion (jarak / 1000)</span><strong>{{ n2(tMotion) }} dtk</strong>
                </div>
                <div class="tr-baris utama">
                  <span>CT PER TITIK SPOT</span><strong>{{ n2(ctSpot) }} dtk</strong>
                </div>
                <div class="tr-baris">
                  <span v-if="pakaiRumusLama">Moving robot, 1x tiap OP</span>
                  <span v-else>Pulang ke home, 1x tiap OP</span>
                  <strong>{{ n2(penutupOp) }} dtk</strong>
                </div>
                <div class="tr-baris utama">
                  <span>CONTOH: OP dengan 9 spot</span>
                  <strong>{{ n2(9 * ctSpot + penutupOp) }} dtk</strong>
                </div>
                <div class="tr-baris">
                  <span>Ʃ spot maksimum untuk target</span>
                  <strong>{{ n1(spotMaks) }} titik</strong>
                </div>
                <div class="tr-baris nada-bad">
                  <span v-if="pakaiRumusLama">Batas keras (waktu las)</span>
                  <span v-else>Batas keras (las + motion)</span>
                  <strong>{{ n2(tLas + tMotion) }} dtk/spot &rarr; {{ n0(batasKeras) }} titik</strong>
                </div>
              </div>
              <p class="hint mt-3">
                <template v-if="pakaiRumusLama">
                  Rumus lama:
                  <code>CT = Ʃspot × waktu gun + moving robot × faktor</code>,
                  dengan waktu gun = stroke + (up slope + down slope + welding baku) × 1 cycle.
                  Moving ditambahkan sekali di akhir tiap baris OP.
                </template>
                <template v-else>
                  Rumus R&amp;D:
                  <code>CT = T.travel + T.squeeze + (N.pulse × T.weld) + T.cool + T.hold + T.motion</code>,
                  dikali jumlah spot, lalu ditambah satu motion pulang ke home tiap OP.
                </template>
              </p>
              <p class="hint">
                Batas keras dihitung dari waktu las + motion. Keduanya tetap ada walau SPM
                dinaikkan setinggi apa pun, jadi part dengan Ʃ spot di atas angka itu tidak akan
                mencapai target dengan cara apa pun selain memecah OP atau menurunkan cycle las.
              </p>

              <div class="panel-hdr px-0 mt-4"><strong>Jadwal istirahat</strong></div>
              <div class="brk-list">
                <div v-for="b in istirahat" :key="b.id" class="brk">
                  <v-icon size="14">mdi-coffee-outline</v-icon>
                  <strong>{{ jamPendek(b.jam_mulai) }}</strong>
                  <span>{{ b.durasi_menit }} mnt</span>
                  <em>{{ b.keterangan }}</em>
                </div>
              </div>
            </v-card>
          </div>
        </v-window-item>
        <!-- ================= TAB RIWAYAT ================= -->
        <v-window-item value="riwayat">
          <v-card elevation="0" border class="pa-4">
            <div class="chart-hdr">
              <div>
                <strong>Riwayat skenario</strong>
                <span>Setiap tindakan tercatat beserta pelakunya, seperti commit. Yang terbaru di atas.</span>
              </div>
            </div>
            <div v-if="!riwayat.length" class="kosong">Belum ada riwayat.</div>
            <div v-else class="rw-list">
              <motion.div v-for="(r, i) in riwayat" :key="r.id" class="rw"
                          :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
                          :transition="{ delay: Math.min(i, 12) * 0.03, duration: 0.25 }">
                <div class="rw-kiri">
                  <span class="rw-bulat" :style="{ background: warnaAksi(r.aksi) }">
                    <v-icon size="13" color="#fff">{{ ikonAksi(r.aksi) }}</v-icon>
                  </span>
                  <span v-if="i < riwayat.length - 1" class="rw-garis" />
                </div>
                <div class="rw-isi">
                  <div class="rw-baris1">
                    <strong>{{ r.aksi.replace('_', ' ') }}</strong>
                    <span class="rw-oleh">{{ r.oleh || '-' }}</span>
                    <span class="rw-waktu">{{ waktuPendek(r.waktu) }}</span>
                  </div>
                  <div class="rw-ringkas">{{ r.ringkas }}</div>
                  <details v-if="r.detail" class="rw-detail">
                    <summary>rincian</summary>
                    <pre>{{ rapikanDetail(r.detail) }}</pre>
                  </details>
                </div>
              </motion.div>
            </div>
          </v-card>
        </v-window-item>
      </v-window>
    </template>

    <v-card v-else-if="!busy" class="pa-8 text-center" elevation="0" border>
      <v-icon size="40" color="grey">mdi-flask-empty-outline</v-icon>
      <p class="mt-2 mb-4">Belum ada skenario uji. Buat satu untuk mulai.</p>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="dlgBaru = true">Skenario baru</v-btn>
    </v-card>

    <!-- ============ dialog skenario baru ============ -->
    <v-dialog v-model="dlgBaru" max-width="580">
      <v-card class="pa-5">
        <h2 class="dlg-judul">Skenario uji baru</h2>
        <p class="hint mb-4">
          Uji skema menumpang periode GLC yang sudah ada sebagai sumber permintaan
          (lot size, pcs/hari, stock IFPD). Yang diuji di sini cara menghitung waktunya.
        </p>
        <v-select v-model="baru.glc_id_sumber" :items="periodeItems" item-title="label"
                  item-value="id" label="Periode GLC sumber" density="compact"
                  variant="outlined" class="mb-3" />
        <v-text-field v-model="baru.nama" label="Nama skenario" density="compact"
                      variant="outlined" class="mb-3" />
        <div class="form-grid-2">
          <v-select v-model="baru.sumber_ct" :items="['HITUNG', 'MASTER']" label="Sumber CT"
                    density="compact" variant="outlined" />
          <v-select v-model="baru.mode_beban" :items="['PER SHIFT', '1 HARI']" label="Mode beban"
                    density="compact" variant="outlined" />
          <v-select v-model="baru.shift" :items="['DAY', 'NIGHT']" label="Shift"
                    density="compact" variant="outlined" />
          <v-text-field v-model.number="baru.target_uph" type="number" label="Target UPH"
                        density="compact" variant="outlined" />
        </div>
        <p class="hint">
          <strong>HITUNG</strong> memakai skema fisika las di tab Parameter CT.
          <strong>MASTER</strong> memakai CT lama yang tersimpan di master part, untuk pembanding.
        </p>
        <div class="dlg-aksi">
          <v-btn variant="text" @click="dlgBaru = false">Batal</v-btn>
          <v-btn color="primary" :loading="busy" @click="buat">Buat &amp; hitung</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- ============ dialog tarik kembali ============ -->
    <v-dialog v-model="dlgTarik" max-width="540">
      <v-card class="pa-5">
        <h2 class="dlg-judul">Tarik kembali versi GLC</h2>
        <p class="hint mt-2 mb-1">
          Versi GLC #{{ header?.glc_id }} akan dibuang dan skenario ini kembali ke ACCEPTED,
          sehingga bisa diperbaiki lalu diterbitkan lagi. Versi sebelumnya tidak tersentuh.
        </p>
        <p class="hint mb-3">
          Ditolak kalau versi itu sudah dibekukan, atau kalau sudah ada versi yang lebih baru
          di periode yang sama.
        </p>
        <v-textarea v-model="alasanTarik" label="Alasan menarik (dicatat di versi itu)"
                    rows="2" density="compact" variant="outlined" />
        <div class="dlg-aksi">
          <v-btn variant="text" @click="dlgTarik = false">Batal</v-btn>
          <v-btn color="warning" :loading="busy" @click="tarik">Tarik kembali</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- ============ dialog revisi ============ -->
    <v-dialog v-model="dlgRevisi" max-width="520">
      <v-card class="pa-5">
        <h2 class="dlg-judul">Minta revisi {{ mesin }}</h2>
        <v-textarea v-model="catatanRevisi" label="Apa yang perlu diperbaiki" rows="3"
                    density="compact" variant="outlined" class="mt-3" />
        <div class="dlg-aksi">
          <v-btn variant="text" @click="dlgRevisi = false">Batal</v-btn>
          <v-btn color="warning" :loading="busy" @click="review('REVISI')">Simpan</v-btn>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { motion } from 'motion-v'
import { useAuthStore } from '@/stores/auth'
import {
  fetchUjiList, fetchUjiDetail, buatUji, hitungUji, ubahUji, fetchKombinasiHasil, fetchSegmen,
  fetchPartUph, reviewRobot, acceptUji, batalAccept, terbitUji,
  fetchParamCt, simpanParamCt, fetchIstirahat,
  fetchDaftarRobot, fetchPartKombinasi, simpanKombinasi, batalTerbit, revisiUji,
  fetchShiftRobot, simpanShiftRobot, fetchRiwayat,
  fetchTskkList, fetchTskk, simpanTskk, salinTskk,
} from '@/services/PCD/Welding/GlcUji'
import { fetchPeriodeList } from '@/services/PCD/Welding/Glc'
import PatternAbcd from '@/components/welding/PatternAbcd.vue'
import JadwalMingguan from '@/components/welding/JadwalMingguan.vue'
import type {
  GlcUji, GlcUjiRobot, GlcUjiKombinasi, GlcUjiSegmen, GlcUjiPart,
  GlcParamCt, GlcIstirahat, TargetStatus, GlcPartKombinasi,
  GlcShiftRobot, GlcUjiRiwayat, GlcTskk, GlcTskkLangkah,
} from '@/types/PCD/Welding/GlcUji'
import type { GlcPeriode } from '@/types/PCD/Welding/Glc'

// warna sudah divalidasi untuk buta warna dan kontras terhadap permukaan terang
const C = {
  seri1: '#2a78d6',   // kerja
  seri2: '#eb6834',   // bottleneck
  baik: '#0ca30c',
  warn: '#fab219',    // diam
  serius: '#ec835a',
  kritis: '#d03b3b',
  netral: '#c3c2b7',  // istirahat terjadwal
  tinta: '#52514e',
  grid: '#e1e0d9',
}

// MySQL mengirim tinyint sebagai string "0", yang truthy di JS
const num = (v: any) => Number(v ?? 0)
const n0 = (v: any) => Number(v ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })
const n1 = (v: any) => Number(v ?? 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const n2 = (v: any) => Number(v ?? 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const n3 = (v: any) => Number(v ?? 0).toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const jamPendek = (t?: string | null) => (t ? String(t).slice(0, 5) : '-')

// nama pelaku diambil dari sesi login, bukan diketik, supaya jejaknya sah
const auth = useAuthStore()
const pelaku = computed(() =>
  (auth.user?.fullname || auth.user?.username || 'tidak dikenal') as string)

const busy = ref(false)
const pesan = ref('')
const pesanOk = ref(true)
const tab = ref('robot')

const ujiList = ref<GlcUji[]>([])
const ujiId = ref<number>(0)
const header = ref<GlcUji | null>(null)
const robot = ref<GlcUjiRobot[]>([])
const mesin = ref('')
const kombinasi = ref<GlcUjiKombinasi[]>([])
const segmen = ref<GlcUjiSegmen[]>([])
const part = ref<GlcUjiPart[]>([])
const paramCt = ref<GlcParamCt | null>(null)
const paramEdit = ref<any>({
  dasar_rumus: 'RND', freq_pln: 50, gun_stroke_dtk: 2, up_slope_cycle: 2,
  down_slope_cycle: 2, welding_baku_cycle: 33, moving_dtk: 3.3,
  faktor_kecepatan: 1, target_uph: 50,
})
/** Rumus lama dipakai produksi; rumus R&D dipakai kajian teknik. */
const pakaiRumusLama = computed(() => paramEdit.value.dasar_rumus === 'LAMA')
const istirahat = ref<GlcIstirahat[]>([])
const periode = ref<GlcPeriode[]>([])
const filterStatus = ref('')

const dlgBaru = ref(false)
const dlgRevisi = ref(false)
const dlgTarik = ref(false)
const alasanTarik = ref('')
const catatanRevisi = ref('')

// editor kombinasi
const daftarRobotRaw = ref<{ machine: string; op_n: number; spot: number }[]>([])
const kombMesin = ref('')
const kombEdit = ref<GlcPartKombinasi[]>([])
const shiftRobot = ref<GlcShiftRobot[]>([])

// ---- TSKK ----
const tskkMesin = ref('')
const tskkList = ref<GlcTskk[]>([])
const tskkId = ref<number>(0)
const kosongTskk = (): any => ({
  id: 0, machine: '', kombinasi: '', no_dokumen: '', tanggal: '', revisi: '0',
  part_no: '', part_name: '', proses: '', dibuat_oleh: '', disetujui_oleh: '',
  status: 'DRAFT', catatan: '',
})
const tskk = ref<any>(kosongTskk())
const tskkLangkah = ref<GlcTskkLangkah[]>([])
const riwayat = ref<GlcUjiRiwayat[]>([])
const baru = ref<any>({
  glc_id_sumber: 0, nama: '', sumber_ct: 'HITUNG',
  mode_beban: 'PER SHIFT', shift: 'DAY', target_uph: 50,
})

// ---------------- turunan ----------------
const ujiItems = computed(() =>
  ujiList.value.map((u) => ({ id: u.id, label: `${u.nama} · ${u.status}` })))

const periodeItems = computed(() =>
  periode.value.map((p) => ({ id: p.id, label: `${p.periode} ${p.periode_type} (v${(p as any).versi ?? 1})` })))

const mesinRow = computed(() => robot.value.find((r) => r.machine === mesin.value) || null)

const siapAccept = computed(() =>
  !!header.value && robot.value.length > 0 &&
  robot.value.every((r) => r.status_review === 'OK'))

const bisaHitung = computed(() =>
  !!header.value && !['ACCEPTED', 'TERBIT'].includes(header.value.status))

const bisaReview = computed(() =>
  !!header.value && !['ACCEPTED', 'TERBIT'].includes(header.value.status))

const langkah = computed(() => {
  const s = header.value?.status ?? 'DRAFT'
  const urut = ['DRAFT', 'REVIEW', 'ACCEPTED', 'TERBIT']
  const i = Math.max(0, urut.indexOf(s))
  const def = [
    { key: 'DRAFT', judul: 'Draft', ket: 'skema dihitung', icon: 'mdi-flask-outline' },
    { key: 'REVIEW', judul: 'Review', ket: 'robot dicek satu per satu', icon: 'mdi-clipboard-check-outline' },
    { key: 'ACCEPTED', judul: 'Diterima', ket: 'semua robot OK', icon: 'mdi-check-decagram-outline' },
    { key: 'TERBIT', judul: 'Terbit', ket: 'jadi versi GLC baru', icon: 'mdi-publish' },
  ]
  return def.map((d, k) => ({ ...d, aktif: k === i, lewat: k < i }))
})

const kpi = computed(() => {
  const h = header.value
  if (!h) return []
  const jam = (m: any) => (Number(m ?? 0) / 60).toLocaleString('id-ID', { maximumFractionDigits: 1 })
  return [
    { label: 'Robot', nilai: h.robot_total, sub: `${h.robot_direview} sudah OK`,
      icon: 'mdi-robot-industrial', nada: '' },
    { label: 'Kombinasi', nilai: h.kombinasi_total, sub: 'tandem & aliran',
      icon: 'mdi-vector-link', nada: '' },
    { label: 'Beban total (jam)', nilai: jam(h.beban_menit), sub: 'seluruh robot dijumlah',
      icon: 'mdi-timer-outline', nada: '' },
    { label: 'Diam (jam)', nilai: jam(h.diam_menit), sub: 'terbuang menjelang istirahat',
      icon: 'mdi-timer-sand-empty', nada: 'nada-warn' },
    { label: 'Lewat blok shift', nilai: h.robot_lewat_shift, sub: 'robot tidak muat',
      icon: 'mdi-alert-circle-outline', nada: num(h.robot_lewat_shift) > 0 ? 'nada-bad' : '' },
    { label: `Part capai ${n0(h.target_uph)}/jam`, nilai: `${h.part_capai_target}/${h.part_total}`,
      sub: 'UPH unit', icon: 'mdi-speedometer', nada: '' },
  ]
})

/** Rumus di layar disalin persis dari backend supaya angkanya sama
 *  sebelum parameter disimpan. */
const tLas = computed(() => {
  const p = paramEdit.value
  const cyc = 1 / Number(p.freq_pln || 50)
  if (pakaiRumusLama.value) {
    // rumus lama: slope naik + slope turun + welding time baku
    return (Number(p.up_slope_cycle || 0) + Number(p.down_slope_cycle || 0)
          + Number(p.welding_baku_cycle || 0)) * cyc
  }
  const n = Math.max(1, Number(p.n_pulse || 1))
  return (Number(p.squeeze_cycle || 0) + n * Number(p.welding_cycle || 0)
        + Math.max(0, n - 1) * Number(p.cool_cycle || 0) + Number(p.hold_cycle || 0)) * cyc
})
const tTravel = computed(() => {
  // rumus lama: komponen ini adalah waktu 1x stroke gun
  if (pakaiRumusLama.value) return Number(paramEdit.value.gun_stroke_dtk || 0)
  const spm = Number(paramEdit.value.spm || 0)
  return spm > 0 ? 60 / spm : 0
})
// rumus lama tidak punya komponen jarak antar titik
const tMotion = computed(() =>
  pakaiRumusLama.value ? 0 : Number(paramEdit.value.jarak_spot_mm || 0) / 1000)
const ctSpot = computed(() => tTravel.value + tLas.value + tMotion.value)
/** Penutup sekali tiap baris OP: moving robot (lama) atau pulang home (R&D). */
const penutupOp = computed(() => pakaiRumusLama.value
  ? Number(paramEdit.value.moving_dtk || 0) * Number(paramEdit.value.faktor_kecepatan || 1)
  : Number(paramEdit.value.pulang_home_dtk || 0))
const ctMaksUnit = computed(() => {
  const t = Number(paramEdit.value.target_uph || 0)
  return t > 0 ? 3600 / t : 0
})
const spotMaks = computed(() =>
  ctSpot.value > 0 ? ctMaksUnit.value / ctSpot.value : 0)
const batasKeras = computed(() => {
  const lantai = tLas.value + tMotion.value
  return lantai > 0 ? ctMaksUnit.value / lantai : 0
})

const segmenPerKombinasi = computed(() => {
  const out: Record<string, GlcUjiSegmen[]> = {}
  for (const s of segmen.value) (out[s.kombinasi] ||= []).push(s)
  return out
})

const partTampil = computed(() =>
  filterStatus.value ? part.value.filter((p) => p.status_target === filterStatus.value) : part.value)

// ---------------- editor kombinasi ----------------
const daftarRobot = computed(() =>
  daftarRobotRaw.value.map((r) => ({
    machine: r.machine, label: `${r.machine} — ${r.op_n} OP, ${r.spot} spot`,
  })))

/** label kombinasi yang dipakai di robot ini, urut kemunculan */
const kombGrup = computed(() => {
  const out: string[] = []
  for (const r of kombEdit.value) {
    const k = (r.kombinasi || '').trim()
    if (k && !out.includes(k)) out.push(k)
  }
  return out
})

/** Kombinasi yang anggotanya BEDA PART hanya sah kalau ada TSKK dari R&D:
 *  urutan kerja gabungannya harus dipastikan bisa dijalankan. Kombinasi yang
 *  cuma mengalirkan OP pada part yang sama tidak perlu. */
function perluTskk(r: GlcPartKombinasi) {
  const k = (r.kombinasi || '').trim()
  if (!k) return false
  const anggota = kombEdit.value.filter((x) => (x.kombinasi || '').trim() === k)
  const partBeda = new Set(anggota.map((x) => x.part_number)).size > 1
  // satu dokumen TSKK berlaku untuk seluruh kombinasi, jadi cukup diisi di
  // salah satu barisnya; tanda merah ikut hilang di semua anggotanya
  const adaTskk = anggota.some((x) => (x.tskk_no || '').trim())
  return partBeda && !adaTskk
}

const tskkItems = computed(() => tskkList.value.map((t) => ({
  id: t.id,
  label: `${t.kombinasi} · ${t.status} · ${Number(t.siklus_detik).toFixed(0)} dtk`
       + (t.no_dokumen ? ` · ${t.no_dokumen}` : ''),
})))

/** Rumus siklus disalin persis dari backend supaya angkanya sama sebelum disimpan. */
const ringTskk = computed(() => {
  let auto = 0; let manual = 0; let paralel = 0
  for (const l of tskkLangkah.value) {
    const w = Number(l.waktu_detik || 0)
    const par = l.paralel === 1 && l.jenis !== 'AUTO' && l.jenis !== 'TUNGGU'
    if (l.jenis === 'AUTO') auto += w
    else if (par) paralel += w
    else manual += w
  }
  return { auto, manual, paralel, siklus: auto + manual }
})

/** Tata letak diagram: langkah yang menahan robot maju berurutan, langkah
 *  paralel digambar menumpang di bawah proses robot yang sedang berjalan. */
const petaLangkah = computed(() => {
  const total = Math.max(1, ringTskk.value.siklus)
  const out: any[] = []
  let kursor = 0
  let autoMulai = 0
  let autoSelesai = 0
  tskkLangkah.value.forEach((l, i) => {
    const w = Number(l.waktu_detik || 0)
    const par = l.paralel === 1 && l.jenis !== 'AUTO' && l.jenis !== 'TUNGGU'
    let mulai: number
    if (par) {
      // menumpang di blok AUTO terakhir; kalau belum ada, taruh di kursor
      mulai = autoSelesai > autoMulai ? autoMulai : kursor
      autoMulai = Math.min(autoSelesai, mulai + w)
    } else {
      mulai = kursor
      kursor += w
      if (l.jenis === 'AUTO') { autoMulai = mulai; autoSelesai = kursor }
    }
    out.push({
      i, uraian: l.uraian, jenis: l.jenis, waktu: w, paralel: par,
      kiri: (mulai / total) * 100,
      lebar: Math.max(1.2, (w / total) * 100),
    })
  })
  return out
})

const skalaTskk = computed(() => {
  const t = Math.max(1, ringTskk.value.siklus)
  const n = 5
  return Array.from({ length: n + 1 }, (_, i) => Math.round((t / n) * i))
})

const cacahShift = (n: number) =>
  shiftRobot.value.filter((r) => Number(r.jumlah_shift) === n).length

const waktuPendek = (t: string) => (t || '').slice(5, 16).replace('T', ' ')

function rapikanDetail(d: string) {
  try { return JSON.stringify(JSON.parse(d), null, 2) } catch { return d }
}

const warnaAksi = (a: string) => ({
  BUAT: '#898781', HITUNG: C.seri1, REVIEW: C.seri2, ACCEPT: C.baik,
  BATAL_ACCEPT: C.warn, TERBIT: '#4a3aa7', BATAL_TERBIT: C.kritis,
  UBAH: '#898781', REVISI: C.serius,
} as any)[a] || '#898781'

const ikonAksi = (a: string) => ({
  BUAT: 'mdi-plus', HITUNG: 'mdi-calculator-variant-outline',
  REVIEW: 'mdi-clipboard-check-outline', ACCEPT: 'mdi-check-decagram-outline',
  BATAL_ACCEPT: 'mdi-undo', TERBIT: 'mdi-publish', BATAL_TERBIT: 'mdi-backup-restore',
  UBAH: 'mdi-pencil-outline', REVISI: 'mdi-content-duplicate',
} as any)[a] || 'mdi-circle-small'

/** Dandori hanya boleh di OP pertama tiap kombinasi. Baris lain diredupkan
 *  supaya kelihatan kalau salah isi, tapi tidak dikunci. */
function bolehDandori(i: number) {
  const r = kombEdit.value[i]
  const k = (r?.kombinasi || '').trim()
  if (!k) return true
  return kombEdit.value.findIndex((x) => (x.kombinasi || '').trim() === k) === i
}

const peringatanKomb = computed(() => {
  const w: string[] = []
  for (const g of kombGrup.value) {
    const anggota = kombEdit.value.filter((r) => (r.kombinasi || '').trim() === g)
    const isi = anggota.filter((r) => Number(r.dandori_awal_dtk) > 0)
    const partBeda = new Set(anggota.map((r) => r.part_number)).size > 1
    if (partBeda && !anggota.some((r) => (r.tskk_no || '').trim())) {
      w.push(`Kombinasi "${g}" menggabungkan part yang berbeda tapi belum punya nomor TSKK. `
           + `Gabungan beda part perlu TSKK dari R&D yang memastikan urutan kerjanya bisa dijalankan.`)
    }
    if (isi.length === 0) {
      w.push(`Kombinasi "${g}" belum punya dandori awal — cek TSKK lalu isi di OP yang pertama diproses.`)
    } else if (isi.length > 1) {
      w.push(`Kombinasi "${g}" punya ${isi.length} baris berisi dandori awal. `
           + `Seharusnya hanya OP pertama; sisanya 0 karena handling berikutnya paralel dengan proses robot.`)
    }
    if (anggota.length === 1) {
      w.push(`Kombinasi "${g}" cuma berisi 1 OP — kalau memang berdiri sendiri, kosongkan saja labelnya.`)
    }
  }
  return w
})

/** Isi label per part: tiap part jadi satu kombinasi (aliran OP-nya sendiri). */
function isiOtomatis() {
  const nomor: Record<string, number> = {}
  let n = 0
  for (const r of kombEdit.value) {
    if (!(r.part_number in nomor)) nomor[r.part_number] = ++n
    r.kombinasi = `TANDEM-${nomor[r.part_number]}`
  }
  // dandori dipindah ke OP pertama tiap kombinasi
  for (const g of kombGrup.value) {
    const anggota = kombEdit.value.filter((x) => (x.kombinasi || '').trim() === g)
    const total = anggota.reduce((s, x) => s + Number(x.dandori_awal_dtk || 0), 0)
    anggota.forEach((x, i) => { x.dandori_awal_dtk = i === 0 ? total : 0 })
  }
}

// ---------------- grafik linimasa ----------------
const timelineSeries = computed(() => {
  if (!segmen.value.length) return []
  const kerja: any[] = []; const diam: any[] = []; const brk: any[] = []
  for (const s of segmen.value) {
    const a = Number(s.menit_mulai); const b = Number(s.menit_selesai)
    kerja.push({ x: s.kombinasi, y: [a, b] })
    const d = Number(s.diam_menit)
    if (d > 0.01) diam.push({ x: s.kombinasi, y: [b, b + d] })
    if (s.istirahat_jam) {
      const m = b + d
      brk.push({ x: s.kombinasi, y: [m, m + Number(s.istirahat_menit)] })
    }
  }
  const out: any[] = [{ name: 'Kerja', data: kerja }]
  if (diam.length) out.push({ name: 'Diam', data: diam })
  if (brk.length) out.push({ name: 'Istirahat', data: brk })
  return out
})

/** lebar blok shift robot terpilih, dalam menit KERJA */
const blokMenit = computed(() => Number(mesinRow.value?.blok_shift ?? 0) * 60)

/** Segmen terurut waktu, dipakai beberapa hitungan di bawah. */
const segmenUrut = computed(() =>
  [...segmen.value].sort((a: any, b: any) => Number(a.menit_mulai) - Number(b.menit_mulai)))

/**
 * Jam kerja aktif robot terpilih: beban ditambah menit diam, TANPA istirahat.
 * Inilah yang diadu dengan blok jam kerja - istirahat tidak memakan jatah blok.
 */
const jamAktif = computed(() => {
  const r: any = mesinRow.value
  if (!r) return 0
  return (Number(r.beban_menit || 0) + Number(r.diam_menit || 0)) / 60
})

/**
 * Letak batas blok pada sumbu jam dinding.
 *
 * Blok 8 jam berarti 8 jam KERJA, bukan 8 jam sesudah masuk. Kalau di
 * tengahnya ada istirahat satu jam, batasnya jatuh satu jam lebih siang.
 * Jadi menit kerja dikumpulkan segmen demi segmen sampai menyentuh blok, dan
 * posisi itulah yang dipakai.
 */
const blokMenitDinding = computed(() => {
  const blok = blokMenit.value
  if (blok <= 0) return 0
  let aktif = 0
  for (const s of segmenUrut.value) {
    const a = Number(s.menit_mulai); const b = Number(s.menit_selesai)
    const kerja = b - a
    if (aktif + kerja >= blok) return a + (blok - aktif)
    aktif += kerja + Number(s.diam_menit || 0)
  }
  // pekerjaan habis sebelum blok tersentuh: sisanya diletakkan lurus di ujung
  const last: any = segmenUrut.value[segmenUrut.value.length - 1]
  const akhir = last ? Number(last.menit_selesai) + Number(last.istirahat_menit || 0) : 0
  return akhir + Math.max(0, blok - aktif)
})

/** Ujung kanan sumbu. Minimal sampai batas blok supaya kerangka acuannya
 *  sama antar robot, dan dibulatkan ke jam penuh agar skalanya rapi. */
const batasWaktu = computed(() => {
  let mx = 0
  for (const s of segmen.value) {
    mx = Math.max(mx, Number(s.menit_selesai) + Number(s.diam_menit) + Number(s.istirahat_menit))
  }
  const perlu = Math.max(mx, blokMenitDinding.value, 60)
  return Math.ceil(perlu / 60) * 60
})

/** Skala dibatasi supaya label tidak berdesakan: tiap jam kalau pendek,
 *  tiap 2 atau 4 jam kalau panjang. */
const skalaJam = computed(() => {
  const jam = batasWaktu.value / 60
  const langkah = jam <= 8 ? 1 : jam <= 16 ? 2 : 4
  return Math.min(12, Math.max(2, Math.round(jam / langkah)))
})

/** menit sejak jam mulai shift -> label jam dinding.
 *  Diberi tanda +1 / +2 kalau sudah masuk hari berikutnya, supaya jam yang
 *  berulang tidak membingungkan. */
const jamDari = (menit: number) => {
  const awal = header.value?.jam_mulai ?? '07:15:00'
  const [h, m] = awal.split(':').map(Number)
  const total = h * 60 + m + menit
  const hari = Math.floor(total / 1440)
  const t = ((total % 1440) + 1440) % 1440
  const jj = Math.floor(t / 60); const mm = Math.round(t - jj * 60)
  const jam = `${String(jj % 24).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`
  return hari > 0 ? `${jam} +${hari}` : jam
}

const timelineOpt = computed(() => ({
  chart: { type: 'rangeBar', toolbar: { show: false }, fontFamily: 'inherit',
           animations: { enabled: true, speed: 400 } },
  plotOptions: { bar: { horizontal: true, barHeight: '46%', rangeBarGroupRows: true,
                        borderRadius: 4, borderRadiusApplication: 'end' } },
  colors: [C.seri1, C.warn, C.netral],
  fill: { opacity: 1 },
  stroke: { width: 2, colors: ['#fcfcfb'] },
  xaxis: {
    // dikunci ke rentang shift; tanpa ini ApexCharts memberi bantalan
    // sehingga sumbunya mulai sebelum jam masuk
    type: 'numeric', tickAmount: skalaJam.value, min: 0, max: batasWaktu.value,
    labels: { formatter: (v: any) => jamDari(Number(v)), style: { colors: C.tinta } },
    axisBorder: { color: C.grid }, axisTicks: { color: C.grid },
  },
  yaxis: { labels: { style: { colors: C.tinta } } },
  grid: { borderColor: C.grid, strokeDashArray: 3 },
  legend: { position: 'top', horizontalAlign: 'left', markers: { radius: 3 },
            labels: { colors: C.tinta } },
  dataLabels: { enabled: false },
  // garis batas blok shift: kelihatan langsung robot mana yang lewat
  annotations: blokMenitDinding.value > 0 ? {
    xaxis: [{
      // digeser ke jam dinding tempat jam KERJA menyentuh blok, jadi istirahat
      // di tengah shift tidak ikut memakan jatah blok
      x: blokMenitDinding.value,
      borderColor: C.kritis, strokeDashArray: 4,
      label: {
        text: `batas blok ${n1(mesinRow.value?.blok_shift)} jam kerja`,
        orientation: 'horizontal', position: 'top',
        style: { background: C.kritis, color: '#fff', fontSize: '10px' },
      },
    }],
  } : {},
  tooltip: {
    custom: ({ seriesIndex, dataPointIndex, w }: any) => {
      const d = w.config.series[seriesIndex].data[dataPointIndex]
      const nama = w.config.series[seriesIndex].name
      const a = jamDari(d.y[0]); const b = jamDari(d.y[1])
      const lama = (d.y[1] - d.y[0]).toLocaleString('id-ID', { maximumFractionDigits: 1 })
      return `<div style="padding:8px 10px;font-size:12px">
        <strong>${d.x}</strong><br/>${nama}: ${a} – ${b}<br/>${lama} menit</div>`
    },
  },
}))

// ---------------- grafik UPH ----------------
const partTerjauh = computed(() =>
  [...part.value].sort((a, b) => Number(a.uph_unit) - Number(b.uph_unit)).slice(0, 20))

/** sumbu UPH selalu mencakup target, supaya jaraknya kelihatan */
const batasUph = computed(() => {
  const t = Number(header.value?.target_uph ?? 50)
  const mx = Math.max(0, ...partTerjauh.value.map((p) => Number(p.uph_bottleneck)))
  return Math.ceil(Math.max(t * 1.1, mx * 1.1) / 5) * 5
})

const uphSeries = computed(() => [
  { name: 'UPH unit', data: partTerjauh.value.map((p) => Number(p.uph_unit)) },
  { name: 'UPH bottleneck', data: partTerjauh.value.map((p) => Number(p.uph_bottleneck)) },
])

const uphOpt = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  plotOptions: { bar: { horizontal: true, barHeight: '68%', borderRadius: 4,
                        borderRadiusApplication: 'end' } },
  colors: [C.seri1, C.seri2],
  stroke: { width: 2, colors: ['#fcfcfb'] },
  dataLabels: { enabled: false },
  xaxis: {
    // sumbu dipaksa mencakup garis target; kalau dibiarkan menyesuaikan data,
    // targetnya jatuh di luar layar dan grafiknya kehilangan maksudnya
    categories: partTerjauh.value.map((p) => p.part_number),
    max: batasUph.value,
    labels: { style: { colors: C.tinta } },
    axisBorder: { color: C.grid }, axisTicks: { color: C.grid },
  },
  yaxis: { labels: { style: { colors: C.tinta }, maxWidth: 150 } },
  grid: { borderColor: C.grid, strokeDashArray: 3 },
  legend: { position: 'top', horizontalAlign: 'left', markers: { radius: 3 },
            labels: { colors: C.tinta } },
  annotations: {
    xaxis: [{
      x: Number(header.value?.target_uph ?? 50),
      borderColor: C.kritis, strokeDashArray: 4,
      label: { text: `target ${n0(header.value?.target_uph)}`, style: {
        background: C.kritis, color: '#fff', fontSize: '11px' } },
    }],
  },
  tooltip: { y: { formatter: (v: number) => `${n1(v)} pcs/jam` } },
}))

// ---------------- donut status ----------------
const urutStatus: TargetStatus[] = ['LOLOS', 'SPM', 'PECAH OP', 'MUSTAHIL', 'TIDAK PRODUKSI']
const donutSeries = computed(() =>
  urutStatus.map((s) => part.value.filter((p) => p.status_target === s).length))

const donutOpt = computed(() => ({
  chart: { type: 'donut', fontFamily: 'inherit' },
  labels: urutStatus as unknown as string[],
  colors: [C.baik, C.warn, C.serius, C.kritis, C.netral],
  stroke: { width: 2, colors: ['#fcfcfb'] },
  legend: { position: 'bottom', labels: { colors: C.tinta } },
  dataLabels: { enabled: true, formatter: (_v: number, o: any) => o.w.config.series[o.seriesIndex] },
  plotOptions: { pie: { donut: { size: '62%', labels: {
    show: true, total: { show: true, label: 'part', color: C.tinta } } } } },
  tooltip: { y: { formatter: (v: number) => `${v} part` } },
}))

// ---------------- warna & ikon ----------------
const warnaStatus = (s: string) =>
  ({ DRAFT: 'grey', REVIEW: '#2a78d6', ACCEPTED: '#0ca30c', TERBIT: 'primary', DITOLAK: '#d03b3b' } as any)[s] || 'grey'
const warnaTarget = (s: TargetStatus) =>
  ({ LOLOS: C.baik, SPM: C.warn, 'PECAH OP': C.serius, MUSTAHIL: C.kritis,
     'TIDAK PRODUKSI': C.netral } as any)[s]
const ikonTarget = (s: TargetStatus) =>
  ({ LOLOS: 'mdi-check-circle-outline', SPM: 'mdi-speedometer',
     'PECAH OP': 'mdi-call-split', MUSTAHIL: 'mdi-close-octagon-outline',
     'TIDAK PRODUKSI': 'mdi-minus-circle-outline' } as any)[s]
const ikonReview = (s: string) =>
  ({ BELUM: 'mdi-clock-outline', OK: 'mdi-check-circle', REVISI: 'mdi-comment-alert' } as any)[s]

// ---------------- aksi ----------------
const kabar = (t: string, ok = true) => { pesan.value = t; pesanOk.value = ok }

async function muatAwal() {
  busy.value = true
  try {
    const [u, p, pc, ist, dr] = await Promise.all([
      fetchUjiList(), fetchPeriodeList(), fetchParamCt(), fetchIstirahat(), fetchDaftarRobot(),
    ])
    ujiList.value = u || []
    periode.value = p || []
    paramCt.value = pc
    paramEdit.value = { ...pc }
    istirahat.value = ist || []
    daftarRobotRaw.value = dr || []
    shiftRobot.value = (await fetchShiftRobot()) || []
    tskkMesin.value = daftarRobotRaw.value[0]?.machine ?? ''
    if (tskkMesin.value) await muatTskkList()
    kombMesin.value = daftarRobotRaw.value[0]?.machine ?? ''
    if (kombMesin.value) await muatKombEdit()
    baru.value.glc_id_sumber = periode.value[0]?.id ?? 0
    baru.value.by = pelaku.value
    baru.value.target_uph = Number(pc?.target_uph ?? 50)
    if (ujiList.value.length) { ujiId.value = ujiList.value[0].id; await muatDetail() }
  } catch (e: any) {
    kabar(e?.message || 'Gagal memuat data', false)
  } finally { busy.value = false }
}

async function muatDetail() {
  if (!ujiId.value) return
  busy.value = true
  try {
    const d = await fetchUjiDetail(ujiId.value)
    header.value = d.header
    robot.value = d.robot || []
    if (!robot.value.find((r) => r.machine === mesin.value)) {
      mesin.value = robot.value[0]?.machine ?? ''
    }
    part.value = await fetchPartUph(ujiId.value)
    riwayat.value = (await fetchRiwayat(ujiId.value)) || []
    await muatMesin()
  } catch (e: any) {
    kabar(e?.message || 'Gagal memuat skenario', false)
  } finally { busy.value = false }
}

async function muatMesin() {
  if (!ujiId.value || !mesin.value) { kombinasi.value = []; segmen.value = []; return }
  const [k, s] = await Promise.all([
    fetchKombinasiHasil(ujiId.value, mesin.value),
    fetchSegmen(ujiId.value, mesin.value),
  ])
  kombinasi.value = k || []
  segmen.value = s || []
}

function pilihMesin(m: string) { mesin.value = m; muatMesin() }

async function buat() {
  busy.value = true
  try {
    const r: any = await buatUji(baru.value)
    dlgBaru.value = false
    ujiList.value = (await fetchUjiList()) || []
    ujiId.value = r.id
    await muatDetail()
    kabar('Skenario dibuat dan dihitung')
  } catch (e: any) { kabar(e?.message || 'Gagal membuat skenario', false) }
  finally { busy.value = false }
}

async function hitung() {
  busy.value = true
  try { await hitungUji(ujiId.value, pelaku.value); await muatDetail(); kabar('Skenario dihitung ulang') }
  catch (e: any) { kabar(e?.message || 'Gagal menghitung', false) }
  finally { busy.value = false }
}

async function review(status: string) {
  if (!mesin.value) return
  busy.value = true
  try {
    await reviewRobot(ujiId.value, mesin.value, status,
      status === 'REVISI' ? catatanRevisi.value : undefined, pelaku.value)
    dlgRevisi.value = false
    catatanRevisi.value = ''
    await muatDetail()
  } catch (e: any) { kabar(e?.message || 'Gagal menyimpan review', false) }
  finally { busy.value = false }
}

async function accept() {
  busy.value = true
  try { await acceptUji(ujiId.value, pelaku.value); await muatDetail(); kabar('Skenario diterima') }
  catch (e: any) { kabar(e?.message || 'Gagal accept', false) }
  finally { busy.value = false }
}

async function batal() {
  busy.value = true
  try { await batalAccept(ujiId.value, pelaku.value); await muatDetail(); kabar('Accept dibatalkan') }
  catch (e: any) { kabar(e?.message || 'Gagal membatalkan', false) }
  finally { busy.value = false }
}

async function terbit() {
  busy.value = true
  try {
    const r: any = await terbitUji(ujiId.value, pelaku.value)
    ujiList.value = (await fetchUjiList()) || []
    await muatDetail()
    kabar(r.message || 'Terbit')
  } catch (e: any) { kabar(e?.message || 'Gagal menerbitkan', false) }
  finally { busy.value = false }
}

async function muatKombEdit() {
  if (!kombMesin.value) { kombEdit.value = []; return }
  busy.value = true
  try { kombEdit.value = (await fetchPartKombinasi(kombMesin.value)) || [] }
  catch (e: any) { kabar(e?.message || 'Gagal memuat daftar OP', false) }
  finally { busy.value = false }
}

async function simpanKomb() {
  busy.value = true
  try {
    await simpanKombinasi(kombEdit.value.map((r) => ({
      machine: r.machine, part_number: r.part_number, op: r.op,
      kombinasi: (r.kombinasi || '').trim() || null,
      tskk_no: (r.tskk_no || '').trim() || null,
      tskk_tanggal: r.tskk_tanggal || null,
      tskk_file: r.tskk_file || null,
      dandori_awal_dtk: Number(r.dandori_awal_dtk || 0),
      keterangan: r.keterangan || null,
    })), pelaku.value)
    await muatKombEdit()
    kabar(`Kombinasi ${kombMesin.value} disimpan — jalankan Hitung ulang untuk memakainya`)
  } catch (e: any) { kabar(e?.message || 'Gagal menyimpan kombinasi', false) }
  finally { busy.value = false }
}

async function muatTskkList() {
  if (!tskkMesin.value) { tskkList.value = []; return }
  busy.value = true
  try {
    tskkList.value = (await fetchTskkList(tskkMesin.value)) || []
    if (tskkList.value.length) { tskkId.value = tskkList.value[0].id; await bukaTskk() }
    else tskkBaru()
  } catch (e: any) { kabar(e?.message || 'Gagal memuat daftar TSKK', false) }
  finally { busy.value = false }
}

async function bukaTskk() {
  if (!tskkId.value) return
  busy.value = true
  try {
    const t: any = await fetchTskk(tskkId.value)
    tskkLangkah.value = (t.langkah || []).map((l: any) => ({
      ...l, waktu_detik: Number(l.waktu_detik), paralel: Number(l.paralel) as 0 | 1,
    }))
    delete t.langkah
    tskk.value = { ...t, tanggal: (t.tanggal || '').slice(0, 10) }
  } catch (e: any) { kabar(e?.message || 'Gagal membuka TSKK', false) }
  finally { busy.value = false }
}

function tskkBaru() {
  tskkId.value = 0
  tskk.value = kosongTskk()
  tskk.value.machine = tskkMesin.value
  tskk.value.proses = tskkMesin.value
  tskk.value.dibuat_oleh = pelaku.value
  tskk.value.tanggal = new Date().toISOString().slice(0, 10)
  tskkLangkah.value = []
  tambahLangkah()
}

function tambahLangkah() {
  tskkLangkah.value.push({
    urutan: tskkLangkah.value.length + 1, jig: null, uraian: '',
    jenis: 'MANUAL', waktu_detik: 0, paralel: 0, keterangan: null,
  })
}

function hapusLangkah(i: number) { tskkLangkah.value.splice(i, 1) }

function geserLangkah(i: number, arah: number) {
  const j = i + arah
  if (j < 0 || j >= tskkLangkah.value.length) return
  const a = tskkLangkah.value
  ;[a[i], a[j]] = [a[j], a[i]]
}

async function tskkSimpan() {
  if (!(tskk.value.machine || tskkMesin.value) || !tskk.value.kombinasi) {
    return kabar('Robot dan label kombinasi wajib diisi', false)
  }
  busy.value = true
  try {
    const r: any = await simpanTskk({
      ...tskk.value,
      machine: tskk.value.machine || tskkMesin.value,
      langkah: tskkLangkah.value,
      by: pelaku.value,
    })
    await muatTskkList()
    tskkId.value = r.id
    await bukaTskk()
    kabar(`TSKK disimpan, siklus ${n1(r.ringkas.siklus_detik)} dtk`
        + (tskk.value.status === 'AKTIF' ? ' — jalankan Hitung ulang agar dipakai' : ''))
  } catch (e: any) { kabar(e?.message || 'Gagal menyimpan TSKK', false) }
  finally { busy.value = false }
}

async function tskkSalin() {
  busy.value = true
  try {
    const r: any = await salinTskk(tskkId.value, pelaku.value)
    await muatTskkList()
    tskkId.value = r.id
    await bukaTskk()
    kabar('TSKK disalin jadi revisi baru berstatus DRAFT')
  } catch (e: any) { kabar(e?.message || 'Gagal menyalin', false) }
  finally { busy.value = false }
}

async function simpanShift() {
  busy.value = true
  try {
    await simpanShiftRobot(shiftRobot.value.map((r) => ({
      machine: r.machine, jumlah_shift: r.jumlah_shift, catatan: r.catatan,
    })), pelaku.value)
    shiftRobot.value = (await fetchShiftRobot()) || []
    kabar('Setelan shift disimpan — jalankan Hitung ulang untuk memakainya')
  } catch (e: any) { kabar(e?.message || 'Gagal menyimpan setelan shift', false) }
  finally { busy.value = false }
}

/** Ubah mode beban / shift / sumber CT lalu hitung ulang. */
async function ubahSetelan(kunci: string, nilai: any) {
  if (!header.value || header.value[kunci as keyof typeof header.value] === nilai) return
  busy.value = true
  try {
    await ubahUji(ujiId.value, { [kunci]: nilai, by: pelaku.value })
    await muatDetail()
    kabar(`${kunci.replace('_', ' ')} diubah jadi ${nilai}, skenario dihitung ulang`)
  } catch (e: any) { kabar(e?.message || 'Gagal mengubah setelan', false) }
  finally { busy.value = false }
}

async function tarik() {
  busy.value = true
  try {
    const r: any = await batalTerbit(ujiId.value, alasanTarik.value, pelaku.value)
    dlgTarik.value = false
    alasanTarik.value = ''
    await muatDetail()
    kabar(r.message || 'Versi ditarik kembali')
  } catch (e: any) { kabar(e?.message || 'Gagal menarik versi', false) }
  finally { busy.value = false }
}

async function revisi() {
  busy.value = true
  try {
    const r: any = await revisiUji(ujiId.value, undefined, pelaku.value)
    ujiList.value = (await fetchUjiList()) || []
    ujiId.value = r.id
    await muatDetail()
    kabar(r.message || 'Revisi dibuat')
  } catch (e: any) { kabar(e?.message || 'Gagal membuat revisi', false) }
  finally { busy.value = false }
}

async function simpanParam() {
  busy.value = true
  try {
    const r: any = await simpanParamCt({ ...paramEdit.value, by: pelaku.value })
    paramCt.value = r.data
    paramEdit.value = { ...r.data }
    kabar('Parameter CT disimpan')
  } catch (e: any) { kabar(e?.message || 'Gagal menyimpan parameter', false) }
  finally { busy.value = false }
}

watch(ujiId, () => { mesin.value = '' })
onMounted(muatAwal)
</script>

<style scoped>
.uji-root { padding: 16px 18px 40px; background: #f9f9f7; min-height: 100%; }

/* ---------- header ---------- */
.hdr-card { border: 1px solid rgba(11, 11, 11, 0.08); }
.hdr { display: flex; align-items: center; justify-content: space-between;
       gap: 16px; padding: 14px 18px; flex-wrap: wrap; }
.hdr-left { display: flex; align-items: center; gap: 14px; }
.hdr-icon { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center;
            background: linear-gradient(135deg, #2a78d6, #4a3aa7); color: #fff; }
.hdr h1 { font-size: 19px; font-weight: 700; margin: 0; color: #0b0b0b; }
.hdr p { margin: 2px 0 0; font-size: 12.5px; color: #52514e; }
.hdr-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

/* ---------- alur status ---------- */
.alur { display: flex; align-items: flex-start; gap: 0; flex-wrap: wrap; }
.alur-step { display: flex; align-items: center; gap: 10px; position: relative;
             padding-right: 26px; opacity: 0.45; }
.alur-step.aktif, .alur-step.lewat { opacity: 1; }
.alur-bulat { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center;
              background: #e1e0d9; color: #52514e; flex: 0 0 auto; }
.alur-step.aktif .alur-bulat { background: #2a78d6; color: #fff; }
.alur-step.lewat .alur-bulat { background: #0ca30c; color: #fff; }
.alur-txt { display: flex; flex-direction: column; line-height: 1.25; }
.alur-txt strong { font-size: 13px; color: #0b0b0b; }
.alur-txt span { font-size: 11.5px; color: #898781; }
.alur-garis { width: 26px; height: 2px; background: #e1e0d9; margin-left: 6px; }
.alur-aksi { display: flex; align-items: center; gap: 8px; margin-top: 14px;
             padding-top: 12px; border-top: 1px solid #e1e0d9; flex-wrap: wrap; }
.alur-info { font-size: 12.5px; color: #52514e; }

/* ---------- kpi ---------- */
.kpi-grid { display: grid; gap: 12px;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.kpi { display: flex; gap: 12px; align-items: center; background: #fcfcfb;
       border: 1px solid rgba(11, 11, 11, 0.08); border-radius: 12px; padding: 14px 16px; }
.kpi-ikon { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center;
            background: #eef4fd; color: #2a78d6; flex: 0 0 auto; }
.kpi.nada-warn .kpi-ikon { background: #fff6e0; color: #8a6100; }
.kpi.nada-bad .kpi-ikon { background: #fdecec; color: #d03b3b; }
.kpi-isi { display: flex; flex-direction: column; min-width: 0; }
.kpi-nilai { font-size: 21px; font-weight: 700; color: #0b0b0b; line-height: 1.15; }
.kpi-label { font-size: 12px; color: #52514e; }
.kpi-sub { font-size: 11px; color: #898781; }

/* ---------- dua kolom ---------- */
.dua-kolom { display: grid; grid-template-columns: 210px 1fr; gap: 16px; align-items: start; }
.dua-kolom-param { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
.pilih-rumus { display: block; font-weight: 600; margin-bottom: 6px; }
.pilih-rumus select { width: 100%; padding: 6px 8px; margin-top: 4px; }
.hint-rumus { margin-bottom: 12px; }
@media (max-width: 1100px) {
  .dua-kolom, .dua-kolom-param { grid-template-columns: 1fr; }
}

.panel-hdr { display: flex; align-items: center; gap: 8px; padding: 12px 14px;
             border-bottom: 1px solid #e1e0d9; font-size: 13px; }
.panel-hdr.px-0 { padding-left: 0; padding-right: 0; }

.robot-list { max-height: 620px; overflow: auto; }
.robot-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px;
              border: 0; background: transparent; cursor: pointer; text-align: left;
              border-bottom: 1px solid #f0efec; font-size: 12.5px; color: #0b0b0b; }
.robot-item:hover { background: #f4f6f9; }
.robot-item.pilih { background: #eef4fd; box-shadow: inset 3px 0 0 #2a78d6; font-weight: 600; }
.ri-nama { flex: 1; }
.ri-jam { color: #898781; font-variant-numeric: tabular-nums; }
.rv-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }
.rv-belum { background: #c3c2b7; }
.rv-ok { background: #0ca30c; }
.rv-revisi { background: #fab219; }

/* ---------- detail ---------- */
.det-hdr { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.det-hdr h2 { font-size: 17px; font-weight: 700; margin: 0; }
.det-hdr p { margin: 2px 0 0; font-size: 12.5px; color: #52514e; }
.det-angka { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
             gap: 10px; margin: 14px 0; }
.det-angka > div { background: #f9f9f7; border-radius: 10px; padding: 10px 12px;
                   display: flex; flex-direction: column; font-size: 11.5px; color: #52514e; }
.det-angka span { font-size: 17px; font-weight: 700; color: #0b0b0b; }
.det-angka .nada-warn span, .det-angka div.nada-warn span { color: #8a6100; }

.review-bar { display: flex; align-items: center; gap: 10px; padding: 10px 12px;
              border-radius: 10px; font-size: 12.5px; background: #f4f4f2; }
.rb-ok { background: #eaf6ea; }
.rb-revisi { background: #fff6e0; }
.rb-txt { color: #52514e; }

/* ---------- grafik ---------- */
.chart-hdr { margin-bottom: 8px; }
.chart-hdr strong { display: block; font-size: 13.5px; color: #0b0b0b; }
.chart-hdr span { display: block; font-size: 11.5px; color: #898781; margin-top: 2px; }
.kosong { font-size: 12.5px; color: #898781; padding: 16px 0; }
.uph-atas { display: grid; grid-template-columns: 360px 1fr; gap: 16px; align-items: start; }
@media (max-width: 1100px) { .uph-atas { grid-template-columns: 1fr; } }

/* ---------- tabel: dibuat menyerupai lembar Excel ----------
   Garis tipis di tiap sel, kepala biru pekat yang menempel waktu digulung,
   baris rapat, dan angka rata kanan dengan lebar digit seragam. */
.tabel {
  --xl-garis: #9fb6c8;
  --xl-biru: #4f8fbd;
  --xl-abu: #eef2f5;
  font-size: 12px;
}
.tabel :deep(table) { border-collapse: collapse; }
.tabel :deep(th),
.tabel :deep(td) {
  /* Vuetify memasang border-bottom sendiri yang nyaris tidak kelihatan,
     dan aturannya lebih kuat, jadi di sini perlu dipaksa. */
  border: 1px solid var(--xl-garis) !important;
  padding: 2px 6px !important;
  height: auto !important;
  white-space: nowrap;
}
.tabel :deep(thead th) {
  background: var(--xl-biru);
  color: #fff;
  font-weight: 700;
  text-align: center;
  vertical-align: middle;
  line-height: 1.15;
  position: sticky;
  top: 0;
  z-index: 2;
}
.tabel :deep(thead th small) { font-weight: 400; color: #dbe9f4; }
/* Warna selang-seling sengaja tidak dikenakan pada baris kelompok, supaya
   penanda birunya yang sudah ada tidak tertimpa. */
.tabel :deep(tbody tr:nth-child(even):not(.baris-grup) td) { background: #f7fafc; }
.tabel :deep(tbody tr:hover td) { background: #e8f2fa; }
.tabel th { font-weight: 700; white-space: nowrap; vertical-align: middle; }
.tabel td { color: #0b0b0b; }
.tabel .ka { text-align: right; font-variant-numeric: tabular-nums; }
.tabel .tg { text-align: center; }
.tabel .tebal { font-weight: 700; }
.tabel .isi { color: #52514e; max-width: 260px; white-space: normal; }
.tabel .saran { color: #52514e; font-size: 11px; max-width: 420px; white-space: normal; }
/* sel isian diberi warna kuning seperti kebiasaan di lembar kerja */
.tabel :deep(input),
.tabel :deep(.v-field__input) { background: #fff2a8; }
.tag-nolabel { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 5px;
  background: #f0efec; color: #898781; font-size: 10px; font-weight: 400; }
.txt-warn { color: #8a6100; }
.txt-lemah { color: #8b95a1; font-weight: 400; }
.txt-bad { color: #d03b3b; }

/* ---------- segmen ---------- */
.seg-grup { padding: 10px 0; border-bottom: 1px solid #f0efec; }
.seg-grup:last-child { border-bottom: 0; }
.seg-judul { font-size: 12.5px; font-weight: 600; margin-bottom: 6px; }
.seg-alur { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.seg-kerja { background: #eef4fd; border: 1px solid #cde2fb; color: #184f95;
             border-radius: 8px; padding: 4px 9px; font-size: 12px;
             font-variant-numeric: tabular-nums; }
.seg-kerja small { color: #52514e; margin-left: 5px; }
.seg-brk { display: inline-flex; align-items: center; gap: 5px; background: #f4f4f2;
           border: 1px dashed #c3c2b7; color: #52514e; border-radius: 8px;
           padding: 4px 9px; font-size: 11.5px; }
.seg-brk em { color: #8a6100; font-style: normal; }

/* ---------- form ---------- */
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
.form-grid label { display: flex; flex-direction: column; font-size: 11.5px; color: #52514e; gap: 4px; }
.form-grid input, .form-grid select { border: 1px solid #d8d7d0; border-radius: 8px;
  padding: 7px 9px; font-size: 13px; color: #0b0b0b; background: #fff; }
.form-grid input:focus, .form-grid select:focus { outline: 2px solid #2a78d6; outline-offset: -1px; }
.hint { font-size: 11.5px; color: #898781; margin: 6px 0 0; }
.hint code { background: #f0efec; padding: 1px 5px; border-radius: 4px; font-size: 11px; }

.turunan { display: flex; flex-direction: column; gap: 2px; }
.tr-baris { display: flex; justify-content: space-between; align-items: baseline;
            padding: 8px 10px; border-radius: 8px; font-size: 12.5px; color: #52514e; }
.tr-baris:nth-child(odd) { background: #f9f9f7; }
.tr-baris strong { font-size: 15px; color: #0b0b0b; font-variant-numeric: tabular-nums; }
.tr-baris.utama { background: #eef4fd; }
.tr-baris.utama strong { color: #184f95; }
.tr-baris.nada-bad { background: #fdecec; }
.tr-baris.nada-bad strong { color: #d03b3b; }

.brk-list { display: flex; flex-direction: column; gap: 4px; }
.brk { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #52514e;
       padding: 5px 8px; background: #f9f9f7; border-radius: 7px; }
.brk strong { font-variant-numeric: tabular-nums; color: #0b0b0b; }
.brk em { font-style: normal; color: #898781; }

/* ---------- editor kombinasi ---------- */
.komb-bar { display: flex; align-items: center; gap: 10px; margin: 12px 0 14px; flex-wrap: wrap; }
.baris-grup td { background: #f7fbff; }
.sel-komb, .inp-dand, .inp-ket { width: 100%; border: 1px solid #d8d7d0; border-radius: 7px;
  padding: 5px 8px; font-size: 12.5px; color: #0b0b0b; background: #fff; }
.inp-dand { text-align: right; font-variant-numeric: tabular-nums;
  min-width: 62px; }   /* tombol putar angka memakan tempat; tanpa ini nilai 2 digit terpotong */
.inp-dand.redup { background: #f4f4f2; color: #898781; }
.sel-komb:focus, .inp-dand:focus, .inp-ket:focus { outline: 2px solid #2a78d6; outline-offset: -1px; }
.terbit-info { display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin: 12px 0 0; padding: 9px 12px; background: #eef4fd; border-radius: 9px;
  font-size: 12px; color: #184f95; }
.terbit-info a { color: #2a78d6; font-weight: 600; }

/* ---------- setelan skenario ---------- */
.setelan-skenario { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin-top: 12px; padding-top: 12px; border-top: 1px solid #e1e0d9; }
.ss-judul { font-size: 12px; font-weight: 600; color: #52514e; }
.ss-ket { font-size: 11px; color: #898781; flex: 1 1 260px; }

/* ---------- setelan shift ---------- */
.shift-grid { display: grid; gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
.shift-kartu { border: 1px solid #e1e0d9; border-radius: 10px; padding: 10px 12px;
  display: flex; flex-direction: column; gap: 7px; background: #fcfcfb; }
.shift-kartu.sh-0 { background: #fdecec; border-color: #f3c9c9; }
.shift-kartu.sh-2 { background: #eef4fd; border-color: #cde2fb; }
.sk-nama { font-size: 13px; font-weight: 700; color: #0b0b0b; }
.sk-pilih { align-self: flex-start; }
.sk-catatan { border: 1px solid #d8d7d0; border-radius: 6px; padding: 4px 7px;
  font-size: 11.5px; background: #fff; }
.sk-catatan:focus { outline: 2px solid #2a78d6; outline-offset: -1px; }
.perlu-tskk { border-color: #d03b3b !important; background: #fdecec; }

/* ---------- TSKK ---------- */
.tskk-kepala { display: grid; gap: 8px; margin: 12px 0;
  grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); }
.tskk-kepala label { display: flex; flex-direction: column; gap: 3px;
  font-size: 11px; color: #52514e; }
.tskk-kepala input, .tskk-kepala select { border: 1px solid #d8d7d0; border-radius: 7px;
  padding: 6px 8px; font-size: 12.5px; background: #fff; color: #0b0b0b; }
.tskk-kepala input:focus, .tskk-kepala select:focus { outline: 2px solid #2a78d6;
  outline-offset: -1px; }

.tskk-ring { display: grid; gap: 10px; margin: 4px 0 14px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
.tskk-ring > div { background: #f9f9f7; border-radius: 10px; padding: 9px 12px;
  display: flex; flex-direction: column; font-size: 11.5px; color: #52514e; }
.tskk-ring span { font-size: 18px; font-weight: 700; color: #0b0b0b;
  font-variant-numeric: tabular-nums; }
.tskk-ring .utama { background: #eef4fd; }
.tskk-ring .utama span { color: #184f95; }
.tskk-ring .nada-ok span { color: #0ca30c; }

.tskk-diagram { border: 1px solid #e1e0d9; border-radius: 10px; padding: 12px 14px;
  background: #fcfcfb; }
.td-judul { font-size: 12.5px; font-weight: 600; margin-bottom: 8px; }
.td-baris { display: flex; align-items: center; gap: 10px; margin-bottom: 3px; }
.td-nama { width: 250px; flex: 0 0 auto; font-size: 11.5px; color: #52514e;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td-no { display: inline-block; width: 18px; color: #898781; }
.td-jalur { position: relative; height: 18px; flex: 1; background: #f4f4f2;
  border-radius: 4px; }
.td-bar { position: absolute; top: 2px; height: 14px; border-radius: 3px;
  display: flex; align-items: center; justify-content: center; color: #fff;
  font-size: 9.5px; overflow: hidden; }
.tb-auto { background: #2a78d6; }
.tb-manual { background: #eb6834; }
.tb-jalan { background: #eda100; }
.tb-tunggu { background: #d03b3b; }
.tb-par { opacity: 0.75; border: 1px dashed #fcfcfb; }
.td-skala { display: flex; justify-content: space-between; margin-left: 260px;
  font-size: 10px; color: #898781; margin-top: 4px; }
.td-legenda { display: flex; gap: 12px; margin-top: 8px; margin-left: 260px; }
.lg { font-size: 10.5px; color: #52514e; display: inline-flex; align-items: center; gap: 4px; }
.lg::before { content: ''; width: 10px; height: 10px; border-radius: 2px; }
.lg-auto::before { background: #2a78d6; }
.lg-manual::before { background: #eb6834; }
.lg-par::before { background: #eb6834; opacity: 0.75; border: 1px dashed #898781; }
.lg-tunggu::before { background: #d03b3b; }

.inp-kecil { width: 100%; min-width: 52px; border: 1px solid #d8d7d0; border-radius: 6px;
  padding: 4px 6px; font-size: 12px; background: #fff; }
.inp-kecil.lebar { min-width: 92px; }
.inp-kecil:focus { outline: 2px solid #2a78d6; outline-offset: -1px; }

/* ---------- riwayat ---------- */
.rw-list { display: flex; flex-direction: column; }
.rw { display: flex; gap: 12px; }
.rw-kiri { display: flex; flex-direction: column; align-items: center; flex: 0 0 auto; }
.rw-bulat { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center;
  flex: 0 0 auto; }
.rw-garis { width: 2px; flex: 1; background: #e1e0d9; margin: 3px 0; }
.rw-isi { padding-bottom: 14px; min-width: 0; flex: 1; }
.rw-baris1 { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.rw-baris1 strong { font-size: 12.5px; color: #0b0b0b; }
.rw-oleh { font-size: 12px; color: #2a78d6; font-weight: 600; }
.rw-waktu { font-size: 11px; color: #898781; font-variant-numeric: tabular-nums; }
.rw-ringkas { font-size: 12px; color: #52514e; margin-top: 2px; }
.rw-detail { margin-top: 4px; }
.rw-detail summary { font-size: 11px; color: #898781; cursor: pointer; }
.rw-detail pre { font-size: 10.5px; color: #52514e; background: #f9f9f7; padding: 8px 10px;
  border-radius: 7px; margin: 4px 0 0; overflow-x: auto; }

/* ---------- dialog ---------- */
.dlg-judul { font-size: 16px; font-weight: 700; margin: 0; }
.dlg-aksi { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
</style>
