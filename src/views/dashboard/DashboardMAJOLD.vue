<template>
  <v-container fluid>
    <!-- ROW 1: 5 card horizontal -->
    <v-row class="mb-3 tight-row">
      <v-col cols="12">
        <div class="cards-grid">
          <v-card
            v-for="(item, i) in items"
            :key="i"
            elevation="0"
            variant="outlined"
            class="pa-4 hover:cursor-pointer square-card"
            @click="goTo(item.link)"
          >
            <v-card-text class="pa-0">
              <div class="card-grid">
                <!-- kiri -->
                <div class="left">
                  <div class="icon-pill mb-2" :style="{ backgroundColor: bg(item.color) }">
                    <component :is="item.icon" :style="{ fontSize: '16px', color: item.color }" />
                  </div>
                  <h6 class="text-h6 text-lightText mb-1">{{ item.title }}</h6>
                  <h4 class="text-h4 mb-1">{{ fmt(item.counter || '-') }}</h4>
                </div>

                <!-- kanan -->
                <div class="right">
                  <v-avatar size="96" tile>
                    <v-img :src="getImage(item.src)" cover />
                  </v-avatar>
                </div>

                <!-- deskripsi -->
                <div class="desc">
                  <span class="desc-line text-caption text-lightText">
                    There is
                    <span :style="{ color: item.color, fontWeight: 600 }">{{ fmt(item.counter || '-') }}</span>
                    <span>&nbsp;stock&nbsp;part</span>
                    today
                  </span>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-col>
    </v-row>

    <!-- ROW 2: kiri card kosong 1/4, kanan charts 3/4 -->
    <v-row align="stretch" class="tight-row">
      <v-col cols="12" md="3" class="mb-3 mb-md-0">
        <v-card class="pa-4 blank-card" elevation="0" variant="outlined">
          <h2 class="text-center mb-2">Card Kosong</h2>
        </v-card>
      </v-col>

      <v-col cols="12" md="9">
        <v-card width="100%" class="pa-3 mb-3" variant="outlined">
          <h2 class="text-center mb-2">
            Plan VS Actual Stamping
            {{ dateIndonesian(getCurrentShift().date) }} Shift
            {{ getCurrentShift().shift }}
          </h2>
          <PlantvsActualStamping />
        </v-card>

        <v-card width="100%" class="pa-3" variant="outlined">
          <h2 class="text-center mb-2">
            Plan VS Actual Welding
            {{ dateIndonesian(getCurrentShift().date) }} Shift
            {{ getCurrentShift().shift }}
          </h2>
          <PlantvsActualWelding />
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardStore } from '@/pinia/admin/dashboard';
import { useConfigStore } from '@/pinia/config';
import { useUtilityStore } from '@/pinia/utility';
import axios from 'axios';
import { AppstoreOutlined, ToolOutlined, CarOutlined } from '@ant-design/icons-vue';

// chart
// import PlantvsActualStamping from '@/views/dashboard/components/chart/PlanDeliveryChart.vue';
// import PlantvsActualWelding from '@/views/dashboard/components/chart/PlantvsActualWelding.vue';

export default {
  components: {
    // PlantvsActualStamping,
    // PlantvsActualWelding,
  },
  setup() {
    const router = useRouter();
    const configStore = useConfigStore();
    const utilityStore = useUtilityStore();
    const dashboardStore = useDashboardStore();
    const fmt = (v) => {
      if (v === '-' || v === null || v === undefined) return '-';
      return Number(v).toLocaleString('id-ID'); // Format angka jika ada data
    };
    const bg = (hex) => `${hex}26`;

    const items = reactive([
      { color: '#4E9F3D', src: 'irm-inhouse.jpg', counter: '2403', descriptions: '', title: 'IRM INHOUSE', type: 'IRM INHOUSE', icon: AppstoreOutlined, link: 'irm-inhouse-rundown' },
      { color: '#4E9F3D', src: 'irm-outhouse.jpg', counter: '2212', descriptions: '', title: 'IRM OUTHOUSE', type: 'IRM OUTHOUSE', icon: AppstoreOutlined, link: 'irm-outhouse-rundown' },
      { color: '#FF9300', src: 'wip-inhouse.jpg', counter: '1422', descriptions: '', title: 'WIP INHOUSE', type: 'WIP INHOUSE', icon: ToolOutlined, link: 'wip-rundown-inhouse' },
      { color: '#FF9300', src: 'wip-outhouse.jpg', counter: '1656', descriptions: '', title: 'WIP OUTHOUSE', type: 'WIP OUTHOUSE', icon: ToolOutlined, link: 'wip-rundown-outhouse' },
      { color: '#2F86A6', src: 'ifp-inhouse.jpg', counter: '7767', descriptions: '', title: 'FINISH PART', type: 'IFP INHOUSE', icon: CarOutlined, link: 'ifp-inhouse-rundown' },
    ]);

    const goTo = (link) => {
      router.push({ name: link });
    };

    const getImage = (src) => `${import.meta.env.BASE_URL}assets/${src}`;

    onMounted(() => {
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory`)
        .then((response) => {
          if (response.status === 200) {
            response.data.forEach((element) => {
              const item = items.find((i) => i.type === element.type);
              if (item) item.counter = element.total;
            });
          }
        })
        .catch(console.error);
    });

    return {
      items,
      goTo,
      getImage,
      dateIndonesian: utilityStore.dateIndonesian,
      getCurrentShift: utilityStore.getCurrentShift,
      fetchDataUpdate: dashboardStore.fetchDataUpdate,
      readUpdate: dashboardStore.readUpdate,
      fmt,
      bg,
    };
  },
};
</script>

<style scoped>
.cards-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr)); /* 5 kolom fix */
  gap: 16px;
}
@media (max-width: 1279px) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 959px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 599px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}

.card-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px;
  grid-template-areas:
    "left right"
    "desc desc";
  grid-template-rows: 120px auto;
  column-gap: 14px;
  align-items: start;
}

.left {
  grid-area: left;
  display: flex;
  flex-direction: column;
}
.right {
  grid-area: right;
  justify-self: end;
  align-self: start;
}
.desc {
  grid-area: desc;
  margin-top: 6px;
}
.desc-line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.left .text-h6 {
  line-height: 1.2;
  margin-bottom: 4px !important;
}
.left .text-h4 {
  line-height: 1.2;
  margin-bottom: 6px !important;
}

.square-card {
  width: 100%;
  min-height: 160px;
  border-radius: 12px;
  transition: transform 0.25s ease;
}

.square-card:hover {
  transform: scale(1.05);
}
.icon-hover:hover {
  transform: scale(1.2);
}

.icon-pill {
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 599px) {
  .card-grid {
    grid-template-columns: minmax(0, 1fr) 80px;
  }
}

.blank-card {
  min-height: 975px;
  border-radius: 12px;
}
</style>