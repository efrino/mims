<!-- views/admin/PCD/Welding/glc-robot.vue
     GLC (Grafik Loading Capacity) Sub Assy Robot Spot.

     Tiga hal yang jadi alasan halaman ini dibuat:
     1. Parameter dibekukan per periode. Begitu satu bulan/minggu ditutup,
        efisiensi, faktor CT, tip dress, toleransi blok, dan hari kerja yang
        dipakai saat itu ikut tersimpan di baris periode. Periode beku tidak
        bisa dihitung ulang, jadi angka bulan lalu tetap seperti waktu itu
        walaupun parameter master hari ini sudah berubah.
     2. Pattern disusun dengan skema tandem/pairing. Selagi jig A dilas,
        operator loading jig B lalu tekan tombol; begitu A selesai, B langsung
        jalan. Waktu loading B tersembunyi di balik waktu las A, gun tidak
        idle. Tandem hanya dihitung kalau jig-nya memang berbeda.
     3. Kebutuhan produksi dipotong stock IFPD dulu (majsf_rundown.stocks)
        sebelum jadi lot size, supaya tidak membuat barang yang sudah ada.

     Backend: majsf_rest_api/api/glc -->
<template>
  <div class="glc-root">
    <header class="hdr">
      <div class="hdr-title">
        <div class="hdr-icon"><i class="mdi mdi-robot-industrial"></i></div>
        <div>
          <h1>GLC Sub Assy Robot Spot</h1>
          <p>Loading capacity &amp; pattern per robot — parameter beku per periode</p>
        </div>
      </div>

      <div class="hdr-ctl">
        <div class="sel">
          <i class="mdi mdi-calendar-month-outline"></i>
          <select v-model="periodeId" @change="loadDetail">
            <option :value="0" disabled>Pilih periode</option>
            <option v-for="p in periodeList" :key="p.id" :value="p.id">
              {{ p.periode }} · {{ p.periode_type }} · v{{ (p as any).versi ?? 1 }}{{ ya(p.is_frozen) ? ' (beku)' : '' }}
            </option>
          </select>
        </div>
        <button class="btn" :disabled="busy" @click="loadDetail">
          <i class="mdi" :class="busy ? 'mdi-loading mdi-spin' : 'mdi-refresh'"></i> Muat
        </button>
        <button class="btn btn-primary" @click="showBuat = true">
          <i class="mdi mdi-plus"></i> Periode baru
        </button>
      </div>
    </header>

    <p v-if="pesan" class="notif" :class="pesanOk ? 'notif-ok' : 'notif-bad'">
      <i class="mdi" :class="pesanOk ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline'"></i>
      {{ pesan }}
    </p>

    <!-- ================= form periode baru ================= -->
    <section v-if="showBuat" class="card">
      <h2><i class="mdi mdi-plus-box-outline"></i> Buat periode baru</h2>
      <p class="hint">
        Parameter yang diisi di sini akan tersimpan bersama periode. Setelah dibekukan,
        nilainya tidak ikut berubah walau master parameter diubah.
      </p>
      <div class="grid-form">
        <label>Periode <input v-model="baru.periode" placeholder="2026-08" /></label>
        <label>Jenis
          <select v-model="baru.periode_type">
            <option>BULANAN</option><option>W1</option><option>W2</option>
            <option>W3</option><option>W4</option><option>W5</option>
          </select>
        </label>
        <label>Hari kerja <input type="number" v-model.number="baru.working_day" /></label>
        <label>Efisiensi <input type="number" step="0.01" v-model.number="baru.efisiensi" /></label>
        <label>Toleransi blok (jam) <input type="number" step="0.05" v-model.number="baru.toleransi_blok" /></label>
        <label>Dandori (menit) <input type="number" step="0.5" v-model.number="baru.dandori_menit" /></label>
        <label>Stroke per dress <input type="number" v-model.number="baru.stroke_per_dress" /></label>
        <label>Dress per ganti tip <input type="number" v-model.number="baru.dress_per_change" /></label>
        <label>Hari cover stock IFPD <input type="number" step="0.5" v-model.number="baru.hari_cover_stock" /></label>
        <label class="chk"><input type="checkbox" v-model="baru.tandemOn" /> Pakai skema tandem</label>
        <label class="chk"><input type="checkbox" v-model="baru.stockOn" /> Potong stock IFPD</label>
      </div>
      <div class="row-btn">
        <button class="btn btn-primary" :disabled="busy" @click="buatPeriode">Simpan &amp; hitung</button>
        <button class="btn" @click="showBuat = false">Batal</button>
      </div>
    </section>

    <template v-if="header">
      <!-- ================= status beku ================= -->
      <div class="beku" :class="ya(header.is_frozen) ? 'beku-on' : 'beku-off'">
        <i class="mdi" :class="ya(header.is_frozen) ? 'mdi-lock' : 'mdi-lock-open-variant-outline'"></i>
        <div class="beku-txt">
          <strong v-if="ya(header.is_frozen)">Periode beku</strong>
          <strong v-else>Periode masih terbuka</strong>
          <span v-if="ya(header.is_frozen)">
            Dibekukan {{ header.frozen_at }} oleh {{ header.frozen_by || '-' }}.
            Parameter dan hasilnya terkunci apa adanya.
          </span>
          <span v-else>
            Hasil masih bisa dihitung ulang dan ikut berubah kalau master data berubah.
          </span>
        </div>
        <button v-if="!ya(header.is_frozen)" class="btn btn-warn" :disabled="busy" @click="bekukan">
          <i class="mdi mdi-lock-outline"></i> Bekukan
        </button>
        <button v-else class="btn" :disabled="busy" @click="bukaBeku">
          <i class="mdi mdi-lock-open-outline"></i> Buka
        </button>
      </div>

      <!-- ================= saklar cara hitung ================= -->
      <section class="card">
        <div class="card-hdr">
          <h2><i class="mdi mdi-toggle-switch-outline"></i> Cara hitung</h2>
          <span v-if="ya(header.is_frozen)" class="tag">terkunci, periode sudah beku</span>
        </div>
        <div class="saklar">
          <label>
            <input type="checkbox" :checked="ya(header.pakai_stock_ifpd)"
                   :disabled="busy || ya(header.is_frozen)"
                   @change="ubahSaklar('pakai_stock_ifpd', ($event.target as HTMLInputElement).checked ? 1 : 0)" />
            <span>Potong stock IFPD<small>Matikan untuk menyamakan dengan GLC Excel, yang tidak memotong stock.</small></span>
          </label>
          <label>
            <input type="checkbox" :checked="ya(header.pakai_tandem)"
                   :disabled="busy || ya(header.is_frozen)"
                   @change="ubahSaklar('pakai_tandem', ($event.target as HTMLInputElement).checked ? 1 : 0)" />
            <span>Skema tandem / pairing<small>Loading jig berikutnya disembunyikan di balik waktu las jig sebelumnya.</small></span>
          </label>
          <label>
            <input type="checkbox" :checked="header.dasar_pcs_hari === 'CUSTOMER'"
                   :disabled="busy || ya(header.is_frozen)"
                   @change="ubahSaklar('dasar_pcs_hari', ($event.target as HTMLInputElement).checked ? 'CUSTOMER' : 'PABRIK')" />
            <span>Dasar hari kerja customer<small>Order dibagi hari kerja customer masing-masing, bukan satu angka untuk semua. Daftarnya ada di Dasar Perhitungan.</small></span>
          </label>
        </div>
      </section>

      <!-- ================= kartu ringkasan ================= -->
      <div class="kartu">
        <div class="k"><span>Total TPT</span><strong>{{ n(header.total_tpt) }}</strong><small>jam/hari</small></div>
        <div class="k" :class="{ 'k-bad': num(header.max_tpt) > 16.75 }">
          <span>TPT tertinggi</span><strong>{{ n(header.max_tpt) }}</strong><small>jam</small>
        </div>
        <div class="k"><span>Total MP</span><strong>{{ header.total_mp }}</strong><small>orang/hari</small></div>
        <div class="k" :class="{ 'k-bad': num(header.robot_over_blok) > 0 }">
          <span>Robot lewat blok</span><strong>{{ header.robot_over_blok }}</strong><small>dari {{ machines.length }}</small>
        </div>
        <div class="k"><span>Jam PJK</span><strong>{{ n(header.jam_pjk) }}</strong><small>jam/periode</small></div>
        <div class="k"><span>Hari kerja line</span><strong>{{ header.working_day }}</strong>
          <small>hari &mdash; order dibagi WD customer</small></div>
      </div>

      <!-- ================= peringatan data kurang ================= -->
      <section v-if="num(header.part_tanpa_ct) + num(header.part_tanpa_spot) + num(header.part_tanpa_mdfo) > 0"
               class="card card-warn">
        <h2><i class="mdi mdi-alert-outline"></i> Beban ini belum terhitung penuh</h2>
        <p class="hint">
          <template v-if="num(header.part_tanpa_mdfo)">
            {{ header.part_tanpa_mdfo }} part tidak ketemu di MDFO periode ini, jadi order-nya
            dianggap nol dan sama sekali tidak membebani robot.
          </template>
          <template v-if="num(header.part_tanpa_ct)">
            {{ header.part_tanpa_ct }} part punya order tapi <em>cycle time</em>-nya kosong di
            <code>ms_welding</code>.
          </template>
          <template v-if="num(header.part_tanpa_spot)">
            {{ header.part_tanpa_spot }} part jumlah spot-nya kosong, jadi beban tip dresser-nya
            di bawah kenyataan.
          </template>
          Total TPT di atas masih di bawah angka sebenarnya — lengkapi master-nya dulu sebelum
          dipakai untuk keputusan tambah shift.
        </p>
        <button class="btn" @click="bukaDataKurang">
          <i class="mdi mdi-format-list-bulleted"></i>
          {{ dataKurang.length ? 'Sembunyikan' : 'Lihat' }} daftar part
        </button>
        <div v-if="dataKurang.length" class="tbl-wrap">
          <table class="tbl">
            <thead><tr>
              <th>Robot</th><th>Part</th><th>OP</th><th>Model</th>
              <th class="r">Pcs/hari</th><th>Yang kurang</th>
            </tr></thead>
            <tbody>
              <tr v-for="(d, i) in dataKurang" :key="i">
                <td>{{ d.machine || '-' }}</td><td class="mono">{{ d.part_number }}</td>
                <td>{{ d.op || '-' }}</td><td>{{ d.model || '-' }}</td>
                <td class="r">{{ d.pcs_day }}</td><td class="bad">{{ d.masalah }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ================= DASAR PERHITUNGAN ================= -->
      <section class="card">
        <div class="card-hdr">
          <h2><i class="mdi mdi-tune-variant"></i> Dasar Perhitungan</h2>
          <button class="btn btn-ghost" @click="muatDasar">
            <i class="mdi mdi-refresh"></i> Muat ulang
          </button>
        </div>

        <div class="dasar-grid">
          <!-- ---------- 1. parameter pembentuk CT ---------- -->
          <div class="dasar-kotak">
            <div class="td-judul">1 &middot; Parameter pembentuk CT</div>
            <table class="tbl" v-if="paramCt">
              <tbody>
                <tr><td>Dasar rumus</td>
                    <td class="ka"><strong>{{ paramCt.dasar_rumus === 'LAMA' ? 'LAMA' : 'R&D' }}</strong></td></tr>
                <template v-if="paramCt.dasar_rumus === 'LAMA'">
                  <tr><td>Waktu 1x stroke gun</td><td class="ka">{{ n2(paramCt.gun_stroke_dtk) }} dtk</td></tr>
                  <tr><td>Up + down slope</td>
                      <td class="ka">{{ n0(paramCt.up_slope_cycle) }} + {{ n0(paramCt.down_slope_cycle) }} cycle</td></tr>
                  <tr><td>Welding time baku</td><td class="ka">{{ n0(paramCt.welding_baku_cycle) }} cycle</td></tr>
                </template>
                <template v-else>
                  <tr><td>SPM (stroke/menit)</td><td class="ka">{{ n0(paramCt.spm) }}</td></tr>
                  <tr><td>Squeeze / hold</td>
                      <td class="ka">{{ n0(paramCt.squeeze_cycle) }} / {{ n0(paramCt.hold_cycle) }} cycle</td></tr>
                  <tr><td>Welding time per pulse</td><td class="ka">{{ n0(paramCt.welding_cycle) }} cycle</td></tr>
                </template>
                <tr><td>Waktu las</td><td class="ka">{{ n2(paramCt.las_detik) }} dtk</td></tr>
                <tr class="baris-jumlah"><td>CT per titik spot</td>
                    <td class="ka">{{ n2(paramCt.ct_spot_detik) }} dtk</td></tr>
                <tr><td>Moving robot, 1x tiap OP</td>
                    <td class="ka">{{ n2(paramCt.penutup_op_dtk) }} dtk</td></tr>
              </tbody>
            </table>
            <p v-else class="hint">Parameter CT belum termuat.</p>
            <p class="hint">
              CT satu baris OP = <strong>Ʃ spot &times; CT per titik + moving robot</strong>.
              Moving robot lazimnya 3,0&ndash;3,5 detik, rata-rata dipakai 3,3.
              Angkanya diubah di halaman <router-link to="/Transaction/welding/glc-uji-skema">Uji Skema</router-link>.
            </p>
          </div>

          <!-- ---------- 2. periode order ---------- -->
          <div class="dasar-kotak">
            <div class="td-judul">2 &middot; Order ADM per periode</div>
            <div class="tbl-wrap" style="max-height:230px;overflow:auto">
              <table class="tbl">
                <thead>
                  <tr><th style="text-align:left">Periode</th><th>Versi</th>
                      <th>Status</th><th>Keadaan</th></tr>
                </thead>
                <tbody>
                  <tr v-for="p in periodeTertata" :key="p.id"
                      :class="{ 'baris-aktif': p.id === periodeId }">
                    <td>{{ p.periode }} <span class="tag-nolabel">{{ p.periode_type }}</span></td>
                    <td class="tg">v{{ p.versi }}</td>
                    <td class="tg">{{ p.status }}</td>
                    <td class="tg">
                      <span v-if="p.kunci" class="txt-bad">
                        <i class="mdi mdi-lock"></i> beku
                      </span>
                      <span v-else class="txt-ok">bisa diubah</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="hint">
              Bulan berjalan dan bulan-bulan sesudahnya masih bisa dihitung ulang.
              Bulan yang sudah lewat diperlakukan beku &mdash; hasilnya sudah dipakai
              produksi, jadi tidak ikut berubah walau master datanya berubah.
            </p>
          </div>

          <!-- ---------- 3. hari kerja per customer ---------- -->
          <div class="dasar-kotak">
            <div class="td-judul">3 &middot; Hari kerja per customer</div>
            <table class="tbl" v-if="wdCustomer.length">
              <thead>
                <tr><th style="text-align:left">Customer</th>
                    <th class="ka">WD</th><th class="ka">Baris part</th></tr>
              </thead>
              <tbody>
                <tr v-for="c in wdCustomer" :key="c.customer">
                  <td>{{ c.customer }}</td>
                  <td class="ka"><strong>{{ c.wd || '-' }}</strong></td>
                  <td class="ka">{{ c.item }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="hint">Data part belum termuat.</p>
            <p class="hint">
              Hari kerja diambil per customer, bukan satu angka untuk semua &mdash;
              ADM Plant 5 memang berbeda dari yang lain. Angka inilah yang dipakai
              membagi order jadi pcs/hari, dan baris <strong>WD/month</strong> pada
              grafik mengikutinya. Robot yang melayani beberapa customer dengan hari
              kerja berbeda ditampilkan rentangnya, misalnya 22-25. Hari kerja line
              ({{ n0(header?.working_day) }} hari) hanya dipakai kalau part tersebut
              tidak punya hari kerja customer.
            </p>
          </div>

          <!-- ---------- 4. dandori & downtime ---------- -->
          <div class="dasar-kotak">
            <div class="td-judul">4 &middot; Dandori &amp; downtime</div>
            <table class="tbl">
              <tbody>
                <tr>
                  <td>Alokasi downtime</td>
                  <td class="ka"><input class="isian" type="number" step="1"
                        v-model.number="paramEdit.downtime_harian_menit"
                        :disabled="ya(header?.is_frozen)"></td>
                  <td class="sat">menit/hari</td>
                </tr>
                <tr>
                  <td>Waktu 1x tip dresser</td>
                  <td class="ka"><input class="isian" type="number" step="1"
                        v-model.number="paramEdit.tip_dress_sec"
                        :disabled="ya(header?.is_frozen)"></td>
                  <td class="sat">detik</td>
                </tr>
                <tr>
                  <td>Waktu 1x tip change</td>
                  <td class="ka"><input class="isian" type="number" step="1"
                        v-model.number="paramEdit.tip_change_sec"
                        :disabled="ya(header?.is_frozen)"></td>
                  <td class="sat">detik</td>
                </tr>
                <tr>
                  <td>Stroke per 1x dress</td>
                  <td class="ka"><input class="isian" type="number" step="10"
                        v-model.number="paramEdit.stroke_per_dress"
                        :disabled="ya(header?.is_frozen)"></td>
                  <td class="sat">stroke</td>
                </tr>
                <tr>
                  <td>Dress per 1x tip change</td>
                  <td class="ka"><input class="isian" type="number" step="1"
                        v-model.number="paramEdit.dress_per_change"
                        :disabled="ya(header?.is_frozen)"></td>
                  <td class="sat">x</td>
                </tr>
                <tr>
                  <td>Hari kerja line</td>
                  <td class="ka"><input class="isian" type="number" step="1"
                        v-model.number="paramEdit.working_day"
                        :disabled="ya(header?.is_frozen)"></td>
                  <td class="sat">hari</td>
                </tr>
              </tbody>
            </table>
            <p v-if="simpanPesan" class="hint hint-warn">{{ simpanPesan }}</p>
            <button class="btn btn-primary" :disabled="busy || ya(header?.is_frozen)"
                    @click="simpanParam">
              <i class="mdi mdi-content-save-outline"></i> Simpan parameter
            </button>
            <p class="hint">
              Dandori awal (penyiapan WIP di awal shift) diisi per part di halaman
              <router-link to="/Transaction/welding/glc-uji-skema">Uji Skema</router-link>,
              karena angkanya melekat pada part, bukan pada robot. Dandori yang dihitung
              di sini adalah tip change dan dresser, yang mengikuti jumlah stroke.
            </p>
            <p class="hint">
              <strong>Hari kerja line</strong> bukan pembagi order &mdash; order dibagi hari
              kerja customer masing-masing. Angka ini hanya dipakai dua hal: sebagai cadangan
              untuk part yang tidak punya hari kerja customer
              <template v-if="partTanpaWd">
                (periode ini <strong>{{ partTanpaWd }} baris part</strong>)</template>
              <template v-else> (periode ini tidak ada)</template>,
              dan untuk menghitung <strong>Jam PJK per periode</strong> pada ringkasan di atas.
            </p>
          </div>
        </div>
      </section>

      <!-- ================= GRAFIK LOADING CAPACITY ================= -->
      <section class="card">
        <div class="card-hdr">
          <h2><i class="mdi mdi-chart-bar-stacked"></i> Grafik Loading Capacity</h2>
          <button class="btn btn-ghost btn-xls" @click="eksporExcel">
            <i class="mdi mdi-microsoft-excel"></i> Ekspor Excel
          </button>
          <button class="btn btn-ghost" :disabled="busyBal || !periodeId" @click="muatRencana">
            <i class="mdi mdi-scale-balance"></i>
            {{ busyBal ? 'Menghitung...' : (balancing ? 'Hitung ulang rencana' : 'Hitung balancing & round up') }}
          </button>
        </div>

        <p v-if="salahBal" class="hint hint-bad">{{ salahBal }}</p>

        <!-- ---------- 1. keadaan sekarang ---------- -->
        <GrafikGlc ref="grafikCurrent" :data="dataCurrent" :header="header"
                   :wd-per-robot="wdPerRobot"
                   judul="GLC CURRENT — sebelum balancing" />
        <p class="hint">
          Susunan, warna, dan urutan barisnya disamakan dengan grafik GLC di Excel:
          batang bertumpuk TEIKI + TEIRYO + TIP CHANGE + DOWNTIME, kotak TPT di atas tiap
          batang, garis putus-putus acuan blok jam kerja, sumbu UPH di kanan, dan tabel
          keterangan yang kolomnya lurus dengan batangnya.
        </p>

        <template v-if="balancing && roundup">
          <!-- ---------- ringkasan perbandingan ---------- -->
          <div class="banding">
            <table class="tbl tbl-banding">
              <thead>
                <tr>
                  <th style="text-align:left">Perbandingan</th>
                  <th class="ka">Current</th>
                  <th class="ka">After balancing</th>
                  <th class="ka">Round up</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total TPT (jam)</td>
                  <td class="ka">{{ n2(balancing.ringkas.tpt_before) }}</td>
                  <td class="ka">{{ n2(balancing.ringkas.tpt_after) }}</td>
                  <td class="ka">{{ n2(roundup.ringkas.tpt_after) }}</td>
                </tr>
                <tr>
                  <td><strong>{{ SIG }} MP</strong></td>
                  <td class="ka">{{ balancing.ringkas.mp_before }}</td>
                  <td class="ka"><strong>{{ balancing.ringkas.mp_after }}</strong></td>
                  <td class="ka">{{ roundup.ringkas.mp_after }}</td>
                </tr>
                <tr>
                  <td>{{ SIG }} blok jam kerja</td>
                  <td class="ka">{{ n0(balancing.ringkas.blok_before) }}</td>
                  <td class="ka">{{ n0(balancing.ringkas.blok_after) }}</td>
                  <td class="ka"><strong>{{ n0(roundup.ringkas.blok_after) }}</strong></td>
                </tr>
                <tr>
                  <td>Baris part yang berpindah</td>
                  <td class="ka">&mdash;</td>
                  <td class="ka">{{ balancing.ringkas.jumlah_pindah }}</td>
                  <td class="ka">{{ roundup.ringkas.jumlah_pindah }}</td>
                </tr>
                <tr>
                  <td>Selisih total beban</td>
                  <td class="ka">&mdash;</td>
                  <td class="ka" :class="balancing.ringkas.seimbang ? 'txt-ok' : 'txt-bad'">
                    {{ balancing.ringkas.seimbang ? '0 — seimbang' : 'TIDAK SEIMBANG' }}
                  </td>
                  <td class="ka" :class="roundup.ringkas.seimbang ? 'txt-ok' : 'txt-bad'">
                    {{ roundup.ringkas.seimbang ? '0 — seimbang' : 'TIDAK SEIMBANG' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ---------- 2. sesudah balancing ---------- -->
          <GrafikGlc :data="dataBalancing" :header="header"
                     :wd-per-robot="wdPerRobot"
                     judul="GLC AFTER BALANCING — MP sekecil mungkin" />
          <p class="hint">
            Sasarannya menekan kebutuhan MP. PJK boleh dipakai karena blok 11 jam masih satu
            orang; yang dihindari adalah 2 shift. Robot yang memang sudah pasti butuh 2 MP
            sengaja diisi penuh sebagai penampung, supaya robot lain bisa turun ke satu MP.
            Part yang dipindah dipilih yang terbesar dulu agar jumlah perpindahannya sedikit.
          </p>

          <!-- ---------- 3. round up ---------- -->
          <GrafikGlc :data="dataRoundup" :header="header"
                     :wd-per-robot="wdPerRobot"
                     judul="GLC ROUND UP — merapat ke blok jam kerja" />
          <p class="hint">
            Round up <strong>tidak memindahkan part lagi</strong>. Ia berangkat dari hasil
            balancing lalu merapikan jamnya saja: robot yang kelebihan dipangkas ke blok di
            bawahnya, dan jam yang dipangkas diberikan ke robot yang belum penuh. Misalnya
            robot 12 jam dipangkas ke 11, sisa 1 jam diberikan ke robot 10 jam, sehingga
            dua-duanya pas 11 jam &mdash; satu shift penuh dengan PJK.
          </p>
          <p class="hint hint-warn">
            Angka round up adalah <strong>sasaran jam</strong>. Jam bisa dibagi pecahan, tapi
            part tidak; untuk benar-benar mewujudkannya tetap perlu rencana perpindahan part
            di tabel atas. Karena itu MP pada round up bisa terlihat lebih kecil daripada
            yang bisa dicapai perpindahan part.
          </p>

          <!-- ---------- rincian kedua rencana ---------- -->
          <div class="pindah-wrap">
            <div class="pindah-kol">
              <div class="td-judul">
                Perpindahan part pada AFTER BALANCING ({{ balancing.pindah.length }} baris)
              </div>
              <div class="tbl-wrap">
                <table class="tbl">
                  <thead>
                    <tr>
                      <th style="text-align:left">Part</th><th>OP</th>
                      <th>Dari</th><th>Ke</th><th class="ka">Beban (jam)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r, i) in balancing.pindah" :key="i">
                      <td>{{ r.part_no }}</td>
                      <td class="tg">{{ r.op || '-' }}</td>
                      <td class="tg">{{ r.dari }}</td>
                      <td class="tg">{{ r.ke }}</td>
                      <td class="ka">{{ n2(r.beban) }}</td>
                    </tr>
                    <tr v-if="!balancing.pindah.length">
                      <td colspan="5" class="tg">tidak ada part yang perlu dipindah</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="pindah-kol">
              <div class="td-judul">
                Penyesuaian jam pada ROUND UP ({{ roundup.adjust.length }} robot)
              </div>
              <div class="tbl-wrap">
                <table class="tbl">
                  <thead>
                    <tr>
                      <th style="text-align:left">Robot</th><th>Gun</th>
                      <th class="ka">Sebelum</th><th class="ka">Sesudah</th>
                      <th class="ka">Selisih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r, i) in roundup.adjust" :key="i">
                      <td>{{ r.machine }}</td>
                      <td class="tg">{{ (r.gun || '-').replace('GUN ', '') }}</td>
                      <td class="ka">{{ n2(r.jam_sebelum) }}</td>
                      <td class="ka"><strong>{{ n2(r.jam_sesudah) }}</strong></td>
                      <td class="ka" :class="r.selisih < 0 ? 'txt-bad' : 'txt-ok'">
                        {{ r.selisih > 0 ? '+' : '' }}{{ n2(r.selisih) }}
                      </td>
                    </tr>
                    <tr class="baris-jumlah">
                      <td colspan="4">Jumlah seluruh penyesuaian</td>
                      <td class="ka"><strong>{{ n2(jumlahAdjust) }}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ---------- simpan & persetujuan ---------- -->
          <div class="acc-kotak">
            <div class="acc-baris">
              <div>
                <strong>PATAN sekarang mengikuti:</strong>
                <span class="acc-tanda" :class="sumberPatan === 'CURRENT' ? 'acc-current' : 'acc-after'">
                  GLC {{ sumberPatan }}
                </span>
              </div>
              <button class="btn btn-ghost" :disabled="busy" @click="simpanRencana">
                <i class="mdi mdi-content-save-outline"></i> Simpan rencana balancing
              </button>
            </div>

            <div class="tbl-wrap" v-if="daftarRencana.length" style="max-height:200px;overflow:auto">
              <table class="tbl">
                <thead>
                  <tr><th style="text-align:left">Rencana</th><th>Mode</th>
                      <th class="ka">MP</th><th class="ka">Pindah</th>
                      <th>Status</th><th>Tindakan</th></tr>
                </thead>
                <tbody>
                  <tr v-for="r in daftarRencana" :key="r.id"
                      :class="{ 'baris-aktif': r.status === 'ACC' }">
                    <td>{{ r.nama }}<br><span class="tag-nolabel">{{ r.created_at }} &middot; {{ r.created_by || '-' }}</span></td>
                    <td class="tg">{{ r.mode }}</td>
                    <td class="ka">{{ r.mp_before }} &rarr; <strong>{{ r.mp_after }}</strong></td>
                    <td class="ka">{{ r.jumlah_pindah }}</td>
                    <td class="tg">
                      <span :class="r.status === 'ACC' ? 'txt-ok' : ''">{{ r.status }}</span>
                    </td>
                    <td class="tg">
                      <button v-if="r.status !== 'ACC'" class="btn btn-mini"
                              :disabled="busy || r.mode !== 'BALANCING'"
                              @click="setujuiRencana(r.id)">Setujui</button>
                      <button v-else class="btn btn-mini btn-warn"
                              :disabled="busy" @click="batalkanRencana(r.id)">Batalkan</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p class="hint">
              Selama belum ada rencana yang disetujui, PATAN memakai <strong>GLC current</strong>
              &mdash; part tetap di robot asalnya. Begitu satu rencana disetujui, PATAN mengikuti
              robot tujuan pada rencana itu. Hanya boleh ada satu rencana yang berlaku, jadi
              menyetujui yang baru otomatis menurunkan yang lama. Round up tidak bisa disetujui
              karena ia hanya meratakan jam, tidak mengubah part mana ada di robot mana.
            </p>
          </div>
        </template>

        <p v-else-if="!busyBal" class="hint">
          Tekan <strong>Hitung balancing &amp; round up</strong> untuk melihat dua grafik
          berikutnya. Perhitungannya tidak mengubah data apa pun.
        </p>
      </section>

      <!-- ================= KEBUTUHAN MANPOWER ================= -->
      <section class="card">
        <h2><i class="mdi mdi-account-hard-hat"></i> Kebutuhan Manpower</h2>
        <p class="hint">
          Aturannya sama dengan GLC Excel: robot dengan blok shift di atas
          {{ header.batas_mp }} jam butuh 2 MP/hari (dua shift), di bawah atau sama dengan itu
          1 MP/hari, dan robot yang tidak produksi 0 MP.
        </p>
        <div class="kartu">
          <div class="k"><span>Total MP/hari</span><strong>{{ MP.total }}</strong><small>orang</small></div>
          <div class="k"><span>MP shift pagi</span><strong>{{ MP.pagi }}</strong><small>orang</small></div>
          <div class="k"><span>MP shift malam</span><strong>{{ MP.malam }}</strong><small>orang</small></div>
          <div class="k"><span>Robot 2 shift</span><strong>{{ MP.dua }}</strong><small>butuh 2 MP</small></div>
          <div class="k"><span>Robot 1 shift</span><strong>{{ MP.satu }}</strong><small>butuh 1 MP</small></div>
          <div class="k"><span>Robot tidak jalan</span><strong>{{ MP.nol }}</strong><small>0 MP</small></div>
        </div>
        <div class="tbl-wrap" style="margin-top:14px">
          <table class="tbl">
            <thead><tr>
              <th>Blok shift</th><th>Keterangan</th><th class="r">Jumlah robot</th>
              <th class="r">MP per robot</th><th class="r">Total MP</th><th>Robot</th>
            </tr></thead>
            <tbody>
              <tr v-for="b in MP.perBlok" :key="b.blok">
                <td>{{ b.blok }} jam</td>
                <td>{{ b.nama }}</td>
                <td class="r">{{ b.n }}</td>
                <td class="r">{{ b.mp }}</td>
                <td class="r"><strong>{{ b.n * b.mp }}</strong></td>
                <td class="mono kecil">{{ b.mesin.join(', ') }}</td>
              </tr>
              <tr class="baris-total">
                <td colspan="2"><strong>TOTAL</strong></td>
                <td class="r"><strong>{{ machines.length }}</strong></td>
                <td></td>
                <td class="r"><strong>{{ MP.total }}</strong></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ================= beban per robot ================= -->
      <section class="card">
        <div class="card-hdr">
          <h2><i class="mdi mdi-chart-bar"></i> Beban per robot</h2>
          <button class="btn" :disabled="busy || ya(header.is_frozen)" @click="hitungUlang">
            <i class="mdi mdi-calculator-variant-outline"></i> Hitung ulang
          </button>
        </div>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr>
              <th>Robot</th><th class="r">TEIKI</th><th class="r">Tip</th><th class="r">TPT</th>
              <th class="r">Blok</th><th class="r">Sisa</th><th class="r">MP</th>
              <th class="r">Item</th><th class="r">Pcs/hari</th><th class="r">Stroke</th><th>Status</th>
            </tr></thead>
            <tbody>
              <tr v-for="m in machinesSorted" :key="m.machine"
                  class="baris-robot">
                <td class="mono">{{ m.machine }}</td>
                <td class="r">{{ n(m.teiki_jam) }}</td>
                <td class="r">{{ n(m.tip_change_jam) }}</td>
                <td class="r"><strong>{{ n(m.tpt_jam) }}</strong></td>
                <td class="r">{{ m.blok_shift }}</td>
                <td class="r" :class="{ bad: num(m.sisa_jam) < 0 }">{{ n(m.sisa_jam) }}</td>
                <td class="r">{{ m.mp_day }}</td>
                <td class="r">{{ m.item_count }}</td>
                <td class="r">{{ m.pcs_day }}</td>
                <td class="r">{{ m.stroke_day }}</td>
                <td>
                  <span v-if="ya(m.is_over_max)" class="tag tag-bad">lewat blok maksimal</span>
                  <span v-else-if="ya(m.is_over_blok)" class="tag tag-warn">lewat blok</span>
                  <!-- blok 0 tapi masih ada beban: TEIKI-nya nol karena cycle time
                       part-nya kosong, jadi robot ini belum bisa dinilai -->
                  <span v-else-if="num(m.blok_shift) === 0 && num(m.pcs_day) > 0"
                        class="tag tag-warn">belum terhitung, CT kosong</span>
                  <span v-else-if="num(m.blok_shift) === 0" class="tag">tidak produksi</span>
                  <span v-else class="tag tag-ok">aman</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Pattern A/B/C/D dan rekap tandem pindah ke tab PATAN: keduanya soal
           bagaimana part diproduksi, bukan soal berapa beban tiap robot. -->

      <!-- ================= parameter beku ================= -->
      <section class="card">
        <h2><i class="mdi mdi-tune-variant"></i> Parameter periode ini</h2>
        <p class="hint">
          Nilai di bawah tersimpan di baris periode, bukan diambil dari master saat halaman dibuka.
          Inilah yang membuat hasil periode lama tetap konsisten.
        </p>
        <div class="grid-param">
          <div v-for="p in paramTampil" :key="p.k"><span>{{ p.k }}</span><strong>{{ p.v }}</strong></div>
        </div>
      </section>
    </template>

    <p v-else-if="!busy" class="kosong-besar">
      Belum ada periode dipilih. Buat periode baru untuk mulai menghitung.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchPeriodeList, fetchDetail, fetchPart, fetchDataKurang,
  createPeriode, updatePeriode, generateAll, generateGlc, generatePattern,
  freezePeriode, unfreezePeriode, fetchParamDefault
, fetchBalance } from '@/services/PCD/Welding/Glc'
import type {
  GlcPeriode, GlcMachine, GlcPart, GlcDataKurang
, GlcBalance, BarisGrafik } from '@/types/PCD/Welding/Glc'
import GrafikGlc from '@/components/welding/GrafikGlc.vue'
import { fetchParamCt } from '@/services/PCD/Welding/GlcUji'
import { simpanBalance, accBalance, batalAccBalance, fetchBalanceList }
  from '@/services/PCD/Welding/Glc'
import { useAuthStore } from '@/stores/auth'

// siapa yang membekukan / membuat periode ikut tercatat di tabel glc
const auth = useAuthStore()
const siapa = () => auth.checkUserName() || auth.checkUser() || undefined

const SIG = 'Ʃ'   // huruf Ʃ, dipakai di judul kolom GLC Excel

/* ------------------------------------------------------------------ *
 *  BALANCING & ROUND UP
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 *  DASAR PERHITUNGAN
 * ------------------------------------------------------------------ */

/** Parameter pembentuk CT. Sumbernya sama dengan halaman Uji Skema. */
const paramCt = ref<any>(null)

/** Hari kerja per customer, dikumpulkan dari baris part periode ini. */
const wdCustomer = ref<{ customer: string; wd: number; item: number }[]>([])

/**
 * Hari kerja yang dipakai part di tiap robot. Satu robot bisa melayani beberapa
 * customer dengan hari kerja berbeda, jadi yang ditampilkan bisa berupa rentang.
 */
const wdPerRobot = ref<Record<string, string>>({})

/**
 * Part yang tidak punya hari kerja customer, jadi jatuh ke hari kerja line.
 * Dihitung supaya jelas seberapa besar pengaruh angka cadangan itu.
 */
const partTanpaWd = ref(0)

async function muatDasar() {
  if (!periodeId.value) return
  try {
    paramCt.value = await fetchParamCt()
  } catch { paramCt.value = null }
  try {
    const parts = await fetchPart(periodeId.value)
    const peta: Record<string, { customer: string; wd: number; item: number }> = {}
    for (const p of parts as any[]) {
      const c = p.customer || '(tanpa customer)'
      if (!peta[c]) peta[c] = { customer: c, wd: num(p.customer_wd), item: 0 }
      peta[c].item++
    }
    wdCustomer.value = Object.values(peta).sort((a, b) => b.item - a.item)

    const perRobot: Record<string, Set<number>> = {}
    for (const p of parts as any[]) {
      const wd = num(p.customer_wd)
      if (!wd) continue
      if (!perRobot[p.machine]) perRobot[p.machine] = new Set()
      perRobot[p.machine].add(wd)
    }
    const hasil: Record<string, string> = {}
    for (const [mc, set] of Object.entries(perRobot)) {
      const urut = [...set].sort((a, b) => a - b)
      hasil[mc] = urut.length === 1 ? String(urut[0])
                : `${urut[0]}-${urut[urut.length - 1]}`
    }
    wdPerRobot.value = hasil
    partTanpaWd.value = (parts as any[]).filter(p => !num(p.customer_wd)).length
  } catch { wdCustomer.value = []; wdPerRobot.value = {}; partTanpaWd.value = 0 }
}

/**
 * Periode yang boleh diubah: bulan berjalan dan sesudahnya. Bulan yang sudah
 * lewat diperlakukan beku - hasilnya sudah dipakai produksi, jadi tidak boleh
 * berubah lagi walaupun master datanya berubah.
 */
const bulanIni = new Date().toISOString().slice(0, 7)
const periodeTertata = computed(() => [...periodeList.value]
  .sort((a: any, b: any) => String(b.periode).localeCompare(String(a.periode)))
  .map((p: any) => ({
    ...p,
    lewat: String(p.periode) < bulanIni,
    kunci: ya(p.is_frozen) || String(p.periode) < bulanIni,
  })))

/** Isian parameter yang boleh diubah dari halaman ini. */
const paramEdit = ref<Record<string, any>>({})
const simpanPesan = ref('')

function siapkanParamEdit() {
  const h: any = header.value
  if (!h) return
  paramEdit.value = {
    downtime_harian_menit: num(h.downtime_harian_menit),
    tip_dress_sec: num(h.tip_dress_sec),
    tip_change_sec: num(h.tip_change_sec),
    stroke_per_dress: num(h.stroke_per_dress),
    dress_per_change: num(h.dress_per_change),
    working_day: num(h.working_day),
  }
}

async function simpanParam() {
  if (!periodeId.value) return
  busy.value = true
  simpanPesan.value = ''
  try {
    await updatePeriode(periodeId.value, { ...paramEdit.value, updated_by: siapa() })
    simpanPesan.value = 'Parameter tersimpan. Tekan "Hitung ulang" agar hasilnya memakai angka baru.'
    await loadDetail()
  } catch (e: any) {
    simpanPesan.value = e?.message || 'Gagal menyimpan'
  } finally {
    busy.value = false
  }
}

/** Dipakai ekspor Excel untuk membaca susunan baris dari komponen grafik. */
const grafikCurrent = ref<any>(null)

const balancing = ref<GlcBalance | null>(null)
const roundup   = ref<GlcBalance | null>(null)
const busyBal   = ref(false)
const salahBal  = ref('')

/** Mengambil kedua rencana. Backend hanya menghitung, tidak menyimpan apa pun. */
async function muatRencana() {
  if (!periodeId.value) return
  busyBal.value = true
  salahBal.value = ''
  try {
    const [b, r] = await Promise.all([
      fetchBalance(periodeId.value, 'BALANCING'),
      fetchBalance(periodeId.value, 'ROUNDUP'),
    ])
    balancing.value = b
    roundup.value = r
  } catch (e: any) {
    salahBal.value = e?.message || 'Gagal menghitung rencana'
    balancing.value = null
    roundup.value = null
  } finally {
    busyBal.value = false
  }
}

/** Keadaan sekarang, langsung dari glc_machine. */
const dataCurrent = computed<BarisGrafik[]>(() => machines.value.map(m => ({
  machine: m.machine,
  gun: (m as any).gun_type ?? null,
  teiki: num(m.teiki_jam), teiryo: num(m.teiryo_jam),
  tip: num(m.tip_change_jam), dt: num(m.downtime_jam),
  tpt: num(m.tpt_jam), blok: num(m.blok_shift), mp: num(m.mp_day),
  uph: num(m.uph), item: num(m.item_count), pcs: num(m.pcs_day),
  stroke: num(m.stroke_day), spot: num(m.spot_total),
})))

/** Mengubah hasil rencana jadi bentuk yang dipahami komponen grafik. */
function dariRencana(r: GlcBalance | null): BarisGrafik[] {
  if (!r) return []
  return r.robot.map((x: any) => ({
    machine: x.machine,
    gun: x.gun,
    teiki: num(x.teiki_after), teiryo: num(x.teiryo_after),
    tip: num(x.tip_after), dt: num(x.downtime_after),
    tpt: num(x.tpt_after), blok: num(x.blok_after), mp: num(x.mp_after),
    uph: num(x.uph_after), item: num(x.item_after), pcs: num(x.pcs_after),
    stroke: num(x.stroke_after), spot: num(x.spot_after),
  }))
}

const dataBalancing = computed<BarisGrafik[]>(() => dariRencana(balancing.value))
const dataRoundup   = computed<BarisGrafik[]>(() => dariRencana(roundup.value))

/* ---- penyimpanan & persetujuan rencana ---- */
const daftarRencana = ref<any[]>([])
const rencanaAcc = ref<any | null>(null)
const sumberPatan = ref('CURRENT')

async function muatDaftarRencana() {
  if (!periodeId.value) return
  try {
    const d = await fetchBalanceList(periodeId.value)
    daftarRencana.value = d.daftar ?? []
    rencanaAcc.value = d.disetujui ?? null
    sumberPatan.value = d.sumber_patan ?? 'CURRENT'
  } catch { /* diamkan: daftar rencana bukan data pokok halaman */ }
}

async function simpanRencana() {
  if (!periodeId.value) return
  busy.value = true
  try {
    await simpanBalance(periodeId.value, 'BALANCING',
                        `Balancing ${header.value?.periode ?? ''}`.trim(), siapa())
    await muatDaftarRencana()
  } finally { busy.value = false }
}

async function setujuiRencana(id: number) {
  busy.value = true
  try { await accBalance(id, siapa()); await muatDaftarRencana() }
  finally { busy.value = false }
}

async function batalkanRencana(id: number) {
  busy.value = true
  try { await batalAccBalance(id, siapa()); await muatDaftarRencana() }
  finally { busy.value = false }
}

/** Harus nol: round up hanya memindahkan jam, tidak membuat atau menghilangkan. */
const jumlahAdjust = computed(() =>
  (roundup.value?.adjust ?? []).reduce((t, a) => t + Number(a.selisih || 0), 0))

/**
 * Menulis GLC ke berkas Excel dengan susunan yang sama persis dengan tabel di
 * layar: robot jadi kolom, komponen TPT jadi baris, lengkap dengan kotak warna
 * di kolom label. Sengaja memakai exceljs (bukan xlsx) supaya warna, garis, dan
 * lebar kolomnya ikut terbawa - berkasnya langsung enak dipakai, tidak perlu
 * dirapikan lagi di Excel.
 */
async function eksporExcel() {
  const ExcelJS = (await import('exceljs')).default
  const { saveAs } = await import('file-saver')

  // Susunan baris diambil dari komponen grafik supaya berkas Excel dan
  // tampilan tidak mungkin berbeda.
  const g = grafikCurrent.value?.G
  if (!g) return
  const h = header.value
  const wb = new ExcelJS.Workbook()
  wb.creator = 'MIMS - GLC Sub Assy Robot Spot'
  const ws = wb.addWorksheet('GLC', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 2 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const judul = `LINE S/A ADM ROBOT ${(h?.periode || '').toUpperCase()}`
    + (h?.periode_type && h.periode_type !== 'BULANAN' ? ` - ${h.periode_type}` : '')
  const kolomN = g.data.length + 1

  ws.mergeCells(1, 1, 1, kolomN)
  const selJudul = ws.getCell(1, 1)
  selJudul.value = judul
  selJudul.font = { bold: true, size: 14 }
  selJudul.alignment = { horizontal: 'center' }

  // baris kosong pemisah, lalu tabel
  ws.getRow(2).height = 6

  const hex = (c: string) => 'FF' + c.replace('#', '').toUpperCase()

  g.baris.forEach((b: any, i: number) => {
    const r = ws.getRow(i + 3)
    r.getCell(1).value = b.k
    r.getCell(1).font = { bold: !!b.tebal || i === 0, size: 10 }
    r.getCell(1).alignment = { horizontal: 'left' }
    if (b.c) {
      // kotak warna diwakili latar sel label, sama seperti di grafik Excel
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hex(b.c) } }
      r.getCell(1).font = { bold: false, size: 10, color: { argb: 'FFFFFFFF' } }
    }
    g.data.forEach((m: any, j: number) => {
      const sel = r.getCell(j + 2)
      const teks = b.f(m)
      const angka = Number(String(teks).replace(',', '.'))
      sel.value = teks === '' ? null : (isNaN(angka) ? teks : angka)
      sel.alignment = { horizontal: i === 0 ? 'center' : 'right' }
      sel.font = { bold: !!b.tebal, size: 10 }
    })
    r.eachCell({ includeEmpty: true }, (sel) => {
      sel.border = {
        top: { style: 'thin', color: { argb: 'FF9FB6C8' } },
        left: { style: 'thin', color: { argb: 'FF9FB6C8' } },
        bottom: { style: 'thin', color: { argb: 'FF9FB6C8' } },
        right: { style: 'thin', color: { argb: 'FF9FB6C8' } },
      }
    })
    r.height = 15
  })

  // baris jumlah MP, seperti catatan di pojok grafik Excel
  const rTot = ws.getRow(g.baris.length + 4)
  rTot.getCell(1).value = `${SIG} MP`
  rTot.getCell(1).font = { bold: true, size: 11 }
  rTot.getCell(2).value = g.totalMp
  rTot.getCell(2).font = { bold: true, size: 11 }

  ws.getColumn(1).width = 24
  for (let j = 2; j <= kolomN; j++) ws.getColumn(j).width = 9

  const buf = await wb.xlsx.writeBuffer()
  const nama = `GLC Sub Assy Robot ${h?.periode || ''}`.trim().replace(/\s+/g, ' ')
  saveAs(new Blob([buf]), `${nama}.xlsx`)
}

const busy = ref(false)
const pesan = ref('')
const pesanOk = ref(true)
const showBuat = ref(false)

const periodeList = ref<GlcPeriode[]>([])
const periodeId = ref(0)
const header = ref<GlcPeriode | null>(null)
const machines = ref<GlcMachine[]>([])
const dataKurang = ref<GlcDataKurang[]>([])

const baru = ref({
  periode: '', periode_type: 'BULANAN', working_day: 20, efisiensi: 0.9,
  toleransi_blok: 0.75, dandori_menit: 5, stroke_per_dress: 250,
  dress_per_change: 20, hari_cover_stock: 1, tandemOn: true, stockOn: true
})

// Isi form periode baru dari default backend (PCD › Auto › Params GLC Welding); nilai
// di atas hanya cadangan bila request gagal. Parameter yang tak ada di form ikut default
// backend saat createPeriode.
const loadDefault = async () => {
  try {
    const d = await fetchParamDefault()
    Object.assign(baru.value, {
      working_day: Number(d.working_day), efisiensi: Number(d.efisiensi),
      toleransi_blok: Number(d.toleransi_blok), dandori_menit: Number(d.dandori_menit),
      stroke_per_dress: Number(d.stroke_per_dress), dress_per_change: Number(d.dress_per_change),
      hari_cover_stock: Number(d.hari_cover_stock),
      tandemOn: Number(d.pakai_tandem) === 1, stockOn: Number(d.pakai_stock_ifpd) === 1,
    })
  } catch { /* tetap pakai cadangan */ }
}

const n = (v: any) => Number(v || 0).toFixed(2)

// MySQL mengirim tinyint sebagai string ("0"/"1") lewat JSON, dan string "0"
// bernilai true di JavaScript. Semua flag harus lewat sini.
const ya = (v: any) => Number(v) === 1
const num = (v: any) => Number(v || 0)
const n0 = (v: any) => Number(v || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })
const n2 = (v: any) => Number(v || 0).toLocaleString('id-ID',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const machinesSorted = computed(() =>
  [...machines.value].sort((a, b) => Number(b.tpt_jam) - Number(a.tpt_jam)))


const paramTampil = computed(() => {
  const h = header.value
  if (!h) return []
  return [
    { k: 'Hari kerja line', v: h.working_day },
    { k: 'Efisiensi', v: h.efisiensi },
    { k: 'Faktor CT', v: h.faktor_ct },
    { k: 'Tip dress (detik)', v: h.tip_dress_sec },
    { k: 'Tip change (detik)', v: h.tip_change_sec },
    { k: 'Stroke per dress', v: h.stroke_per_dress },
    { k: 'Dress per ganti tip', v: h.dress_per_change },
    { k: 'Toleransi blok (jam)', v: h.toleransi_blok },
    { k: 'Batas MP (jam)', v: h.batas_mp },
    { k: 'Dandori (menit)', v: h.dandori_menit },
    { k: 'Blok 2 shift', v: h.wt_2shift },
    { k: 'Blok 2 shift + PJK 2S', v: h.wt_2shift_pjk2s },
    { k: 'Skema tandem', v: ya(h.pakai_tandem) ? 'dipakai' : 'tidak' },
    { k: 'Potong stock IFPD', v: ya(h.pakai_stock_ifpd) ? 'dipakai' : 'tidak' },
    { k: 'Hari cover stock', v: h.hari_cover_stock }
  ]
})

// ---- geometri grafik ----
// Batang dan tabel keterangan dihitung dari x yang sama, jadi kolomnya
// tidak mungkin bergeser. Ini yang di Excel dipegang oleh Data Table.
/** Hari kerja per minggu. Tetap 5 di line ini, dikonfirmasi produksi. */
const WD_WEEK = 5
/** Jumlah mesin per robot. Satu robot = satu mesin, dikonfirmasi produksi. */
const MC_PER_ROBOT = 1

/** Warna seri disamakan dengan grafik GLC di Excel. */
const WARNA = {
  teiki: '#4472c4',   // biru, bagian terbesar
  teiryo: '#ffc000',  // kuning
  tip: '#ed7d31',     // oranye
  dt: '#c00000',      // merah, paling atas
}


// ---- kebutuhan manpower, aturan sama dengan GLC Excel ----
const MP = computed(() => {
  const h = header.value
  const nama: Record<number, string> = h ? {
    [num(h.wt_1shift)]: '1 shift',
    [num(h.wt_1shift_pjk)]: '1 shift + PJK',
    [num(h.wt_2shift)]: '2 shift',
    [num(h.wt_2shift_pjk1s)]: '2 shift + PJK 1 shift',
    [num(h.wt_2shift_pjk2s)]: '2 shift + PJK 2 shift'
  } : {}

  const per: Record<number, { blok: number; nama: string; n: number; mp: number; mesin: string[] }> = {}
  let total = 0, pagi = 0, malam = 0, satu = 0, dua = 0, nol = 0
  const urut = [...machines.value].sort(
    (a, b) => Number(a.machine.replace(/\D/g, '')) - Number(b.machine.replace(/\D/g, '')))
  for (const m of urut) {
    const b = num(m.blok_shift), mp = num(m.mp_day)
    total += mp
    if (mp >= 1) pagi++
    if (mp >= 2) malam++
    if (mp === 2) dua++; else if (mp === 1) satu++; else nol++
    if (!per[b]) per[b] = { blok: b, nama: b === 0 ? 'tidak produksi' : (nama[b] || '-'), n: 0, mp, mesin: [] }
    per[b].n++
    per[b].mesin.push(m.machine)
  }
  return {
    total, pagi, malam, satu, dua, nol,
    perBlok: Object.values(per).sort((a, b) => a.blok - b.blok)
  }
})

const kabar = (t: string, ok = true) => {
  pesan.value = t; pesanOk.value = ok
  setTimeout(() => { if (pesan.value === t) pesan.value = '' }, 8000)
}

const loadPeriode = async () => {
  periodeList.value = await fetchPeriodeList({ area_code: 'RSW' })
  if (!periodeId.value && periodeList.value.length) {
    periodeId.value = periodeList.value[0].id
    await loadDetail()
  }
}

const loadDetail = async () => {
  if (!periodeId.value) return
  busy.value = true
  try {
    const d = await fetchDetail(periodeId.value)
    header.value = d.header
    machines.value = d.machine
    siapkanParamEdit()
    muatDasar()
    muatDaftarRencana()
    dataKurang.value = []
  } catch (e: any) {
    kabar(e?.response?.data?.message || 'Gagal memuat data', false)
  } finally { busy.value = false }
}

const bukaDataKurang = async () => {
  dataKurang.value = dataKurang.value.length ? [] : await fetchDataKurang(periodeId.value)
}

const buatPeriode = async () => {
  if (!baru.value.periode) return kabar('Periode wajib diisi, contoh 2026-08', false)
  busy.value = true
  try {
    const b: any = { ...baru.value, area_code: 'RSW', created_by: siapa() }
    b.pakai_tandem = baru.value.tandemOn ? 1 : 0
    b.pakai_stock_ifpd = baru.value.stockOn ? 1 : 0
    delete b.tandemOn; delete b.stockOn

    const r = await createPeriode(b)
    const id = r?.data?.id
    const g = await generateAll(id)
    periodeId.value = id
    showBuat.value = false
    await loadPeriode()
    await loadDetail()
    kabar(g?.data?.glc?.peringatan || g?.message || 'Periode dibuat', !g?.data?.glc?.peringatan)
  } catch (e: any) {
    kabar(e?.response?.data?.message || 'Gagal membuat periode', false)
  } finally { busy.value = false }
}

/** ubah satu saklar lalu hitung ulang, supaya efeknya langsung terlihat */
const ubahSaklar = async (kolom: string, nilai: any) => {
  busy.value = true
  try {
    const r = await updatePeriode(periodeId.value, { [kolom]: nilai } as any)
    if (r?.status === false) return kabar(r.message, false)
    const g = await generateGlc(periodeId.value)
    await generatePattern(periodeId.value)
    await loadDetail()
    kabar(g?.data?.peringatan || 'Dihitung ulang: TPT ' + n(header.value?.total_tpt) + ' jam',
          !g?.data?.peringatan)
  } catch (e: any) {
    kabar(e?.response?.data?.message || 'Gagal mengubah setelan', false)
  } finally { busy.value = false }
}

const hitungUlang = async () => {
  busy.value = true
  try {
    const g = await generateGlc(periodeId.value)
    await generatePattern(periodeId.value)
    await loadDetail()
    kabar(g?.data?.peringatan || g?.message || 'Selesai dihitung', !g?.data?.peringatan)
  } catch (e: any) {
    kabar(e?.response?.data?.message || 'Gagal menghitung', false)
  } finally { busy.value = false }
}

const bekukan = async () => {
  if (!confirm('Bekukan periode ini? Setelah beku, parameter dan hasilnya tidak bisa diubah lagi.')) return
  busy.value = true
  try {
    const r = await freezePeriode(periodeId.value, siapa(), 'dibekukan dari halaman GLC')
    await loadDetail(); await loadPeriode()
    kabar(r?.message || 'Periode dibekukan')
  } catch (e: any) {
    kabar(e?.response?.data?.message || 'Gagal membekukan', false)
  } finally { busy.value = false }
}

const bukaBeku = async () => {
  if (!confirm('Buka pembekuan? Hasil periode ini jadi bisa berubah lagi.')) return
  busy.value = true
  try {
    await unfreezePeriode(periodeId.value, siapa())
    await loadDetail(); await loadPeriode()
    kabar('Pembekuan dibuka')
  } catch (e: any) {
    kabar(e?.response?.data?.message || 'Gagal membuka', false)
  } finally { busy.value = false }
}

onMounted(() => { loadPeriode(); loadDefault() })
</script>

<style scoped>
.glc-root { padding: 18px; display: flex; flex-direction: column; gap: 16px; }

.hdr { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
.hdr-title { display: flex; align-items: center; gap: 12px; }
.hdr-icon { width: 44px; height: 44px; border-radius: 10px; display: grid; place-items: center;
  background: #1f4e79; color: #fff; font-size: 22px; }
.hdr h1 { margin: 0; font-size: 20px; font-weight: 700; }
.hdr p { margin: 2px 0 0; font-size: 13px; color: #6b7280; }
.hdr-ctl { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.sel { display: flex; align-items: center; gap: 6px; border: 1px solid #d1d5db;
  border-radius: 8px; padding: 6px 10px; background: #fff; }
.sel select { border: none; outline: none; background: transparent; font-size: 14px; }

.btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #d1d5db;
  background: #fff; border-radius: 8px; padding: 7px 13px; font-size: 14px; cursor: pointer; }
.btn:hover { background: #f3f4f6; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-primary { background: #1f4e79; border-color: #1f4e79; color: #fff; }
.btn-primary:hover { background: #163a5c; }
.btn-warn { background: #b45309; border-color: #b45309; color: #fff; }
.btn-warn:hover { background: #92400e; }

.notif { display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  border-radius: 8px; font-size: 14px; margin: 0; }
.notif-ok { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.notif-bad { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
.card-warn { border-color: #fcd34d; background: #fffbeb; }
.card h2 { margin: 0 0 6px; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.card h3 { margin: 18px 0 8px; font-size: 14px; font-weight: 700; }
.card h3 small { font-weight: 400; color: #6b7280; }
.card-hdr { display: flex; justify-content: space-between; align-items: center;
  gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.hint { font-size: 13px; color: #4b5563; line-height: 1.6; margin: 0 0 12px; }

.grid-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.grid-form label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #374151; }
.grid-form input, .grid-form select { border: 1px solid #d1d5db; border-radius: 7px;
  padding: 7px 9px; font-size: 14px; }
.grid-form .chk { flex-direction: row; align-items: center; gap: 8px; }
.row-btn { display: flex; gap: 8px; margin-top: 14px; }

.beku { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 10px; }
.beku i { font-size: 22px; }
.beku-txt { flex: 1; display: flex; flex-direction: column; font-size: 13px; }
.beku-on { background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; }
.beku-off { background: #f9fafb; border: 1px solid #e5e7eb; color: #374151; }

.kartu { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.k { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px;
  display: flex; flex-direction: column; gap: 2px; }
.k span { font-size: 12px; color: #6b7280; }
.k strong { font-size: 22px; font-weight: 700; color: #111827; }
.k small { font-size: 11px; color: #9ca3af; }
.k-bad strong { color: #b91c1c; }

.tbl-wrap { overflow-x: auto; }
.lgd-mp { margin-left: 14px; font-weight: 600; }
.btn-xls { margin-left: 12px; }
.dasar-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
@media (max-width: 1100px) { .dasar-grid { grid-template-columns: 1fr; } }
.dasar-kotak { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; }
.dasar-kotak .tbl { width: 100%; }
.dasar-kotak .sat { color: #6b7280; font-size: 11px; width: 68px; }
.baris-aktif td { background: #eaf3fb; font-weight: 600; }
input.isian { width: 90px; text-align: right; background: #fff2a8;
  border: 1px solid #9fb6c8; padding: 2px 6px; }
input.isian:disabled { background: #f3f4f6; color: #9ca3af; }
.pindah-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 12px 0; }
@media (max-width: 1100px) { .pindah-wrap { grid-template-columns: 1fr; } }
.pindah-kol .tbl-wrap { max-height: 320px; overflow: auto; }
.baris-jumlah td { background: #eef2f5; font-weight: 700; }
.hint-warn { color: #8a6100; }
.hint-bad { color: #c00000; }
.txt-ok { color: #1e7a3c; }
.acc-kotak { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; margin-top: 12px; }
.acc-baris { display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.acc-tanda { padding: 2px 10px; border-radius: 10px; font-weight: 700; font-size: 11px; }
.acc-current { background: #f3f4f6; color: #4b5563; }
.acc-after { background: #e6f4ea; color: #1e5c34; }
.btn-mini { padding: 2px 10px; font-size: 11px; }
.sv-lbl-tebal { font-weight: 700; }
.sv-cell-tebal { font-weight: 700; }
/* Tampilan lembar Excel: garis tipis di tiap sel, kepala biru pekat yang
   menempel waktu digulung, baris rapat, angka rata kanan. Dibuat sama dengan
   halaman Uji Skema supaya kedua halaman tidak terasa beda alat. */
.tbl {
  --xl-garis: #9fb6c8;
  --xl-biru: #4f8fbd;
  width: 100%; border-collapse: collapse; font-size: 12px;
}
.tbl th, .tbl td { border: 1px solid var(--xl-garis); padding: 2px 6px; white-space: nowrap; }
.tbl th {
  background: var(--xl-biru); color: #fff; font-weight: 700;
  text-align: center; vertical-align: middle; line-height: 1.15;
  position: sticky; top: 0; z-index: 2;
}
.tbl tbody tr:nth-child(even) td { background: #f7fafc; }
.tbl tbody tr:hover td { background: #e8f2fa; cursor: pointer; }
.tbl td.ka, .tbl th.ka { text-align: right; font-variant-numeric: tabular-nums; }
.tbl input { background: #fff2a8; }
.r { text-align: right; }
.mono { font-family: ui-monospace, Consolas, monospace; }
.ok { color: #047857; }
.warn { color: #b45309; }
.bad { color: #b91c1c; }
.kosong { text-align: center; color: #9ca3af; padding: 16px; }
.kosong-besar { text-align: center; color: #6b7280; padding: 48px 0; font-size: 14px; }

.tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px;
  background: #f3f4f6; color: #6b7280; }
.tag-ok { background: #d1fae5; color: #065f46; }
.tag-warn { background: #fef3c7; color: #92400e; }
.tag-bad { background: #fee2e2; color: #991b1b; }

.pat-tab { display: flex; gap: 4px; }
.tab { border: 1px solid #d1d5db; background: #fff; border-radius: 7px;
  width: 34px; height: 32px; cursor: pointer; font-weight: 600; }
.tab-on { background: #1f4e79; border-color: #1f4e79; color: #fff; }

.grid-param { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
.grid-param > div { background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px;
  padding: 8px 12px; display: flex; flex-direction: column; }
.grid-param span { font-size: 11px; color: #6b7280; }
.grid-param strong { font-size: 15px; color: #111827; }

.saklar { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; }
.saklar label { display: flex; gap: 9px; align-items: flex-start; font-size: 13px;
  color: #374151; background: #f9fafb; border: 1px solid #f3f4f6;
  border-radius: 8px; padding: 10px 12px; cursor: pointer; }
.saklar input { margin-top: 2px; }
.saklar span { display: flex; flex-direction: column; gap: 2px; font-weight: 600; }
.saklar small { font-weight: 400; color: #6b7280; line-height: 1.5; }

/* ---- grafik loading capacity ---- */
.legenda { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: #374151; }
.legenda span { display: inline-flex; align-items: center; gap: 5px; }
.legenda i { width: 12px; height: 12px; border-radius: 2px; display: inline-block; }
.grafik-wrap { overflow-x: auto; padding-bottom: 6px; }
.sv-ax { font-size: 11px; fill: #6b7280; }
.sv-val { font-size: 10px; fill: #111827; font-weight: 600; }
.sv-wt { font-size: 10px; font-weight: 600; }
.sv-lbl { font-size: 11px; fill: #374151; font-weight: 600; }
.sv-cell { font-size: 10px; fill: #111827; }
.kecil { font-size: 11px; color: #6b7280; white-space: normal; }
.baris-total td { background: #f3f4f6; border-top: 2px solid #d1d5db; }
</style>
