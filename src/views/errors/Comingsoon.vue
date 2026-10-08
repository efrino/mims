<script>
import { ref } from 'vue';

export default {
  name: 'CounterCards',
  setup() {
    const years = ref(0);
    const days = ref(0);
    const hours = ref(0);
    const minutes = ref(0);
    const seconds = ref(0);
    const lunchDate = new Date('30 February 2026');

    setInterval(() => {
      const currentDate = new Date();
      const lunchTime = lunchDate - currentDate;
      seconds.value = parseInt(lunchTime / 1000);
      minutes.value = parseInt(seconds.value / 60);
      hours.value = parseInt(minutes.value / 60);
      days.value = parseInt(hours.value / 24);
      years.value = parseInt(days.value / 365);
    }, 1000);
    return { years, days, hours, minutes, seconds };
  }
};
</script>

<template>
  <v-row no-gutters class="bg-containerBg">
    <v-col cols="12" class="d-flex align-center justify-center">
      <div class="text-center">
        <div class="ComingsoonWrapper mt-6">
          <img src="@/assets/images/maintenance/under-construction.svg" alt="under construction" class="w-100"/>
          <!-- <img src="@/assets/images/maintenance/coming-soon.png" alt="maintenance" class="w-100" /> -->
        </div>
        <h1 class="text-h1 mb-2 mt-sm-12">Coming Soon</h1>
        <small class="text-h6 text-lightText">Something new is on it's way</small>
        <div class="max450 align-center mt-5">
          <v-row class="ma-0 comingsoon-timer overflow-hidden">
            <v-col cols="3" sm="3">
              <v-card variant="outlined" class="bg-surface">
                <v-card-text class="pa-0">
                  <v-sheet rounded="md" class="Timeblock text-h2 py-3 px-1">{{ days % 365 }} </v-sheet>
                  <h6 class="pa-1 bg-gray100 text-caption mb-0">day</h6>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="3" sm="3">
              <v-card variant="outlined" class="bg-surface">
                <v-card-text class="pa-0">
                  <v-sheet rounded="md" class="Timeblock text-h2 py-3 px-1">{{ hours % 24 }}</v-sheet>
                  <h6 class="pa-1 bg-gray100 text-caption mb-0">hour</h6>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="3" sm="3">
              <v-card variant="outlined" class="bg-surface">
                <v-card-text class="pa-0">
                  <v-sheet rounded="md" class="Timeblock text-h2 py-3 px-1">{{ minutes % 60 }}</v-sheet>
                  <h6 class="pa-1 bg-gray100 text-caption mb-0">minute</h6>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="3" sm="3">
              <v-card variant="outlined" class="bg-surface">
                <v-card-text class="pa-0">
                  <v-sheet rounded="md" class="Timeblock text-h2 py-3 px-1">{{ seconds % 60 }}</v-sheet>
                  <h6 class="pa-1 bg-gray100 text-caption mb-0">second</h6>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
        <v-row  class="ma-0">
          <v-col cols="12" class="pt-7 pb-0">
            <v-btn variant="flat" color="primary" to="/">Back To Dashboard</v-btn>
          </v-col>
        </v-row>
      </div>
    </v-col>
  </v-row>
</template>
<style lang="scss">
.max450 {
  max-width: 450px;
  margin: 0 auto;
}
.Timeblock {
  @media (max-width: 768px) {
    font-size: 1.25rem !important;
    line-height: 1.4;
  }
}
.ComingsoonWrapper {
  @media (min-width: 0px) {
    width: 300px;
    margin-inline: auto;
  }
  @media (min-width: 768px) {
    width: 480px;
  }
}
.comingsoon-timer {
  > div {
    padding: 20px;
    position: relative;
    @media (max-width: 768px) {
      padding: 12px;
    }
    &::before {
      position: absolute;
      content: ':';
      font-weight: 600;
      font-size: 2.375rem;
      line-height: 1.21;
      padding-left: 16px;
      top: 50%;
      transform: translateY(-50%);
      right: -6px;
      @media (max-width: 768px) {
        right: -5px;
      }
    }
    &:nth-last-child(-n + 1) {
      &::before {
        display: none;
      }
    }
  }
}
</style>
