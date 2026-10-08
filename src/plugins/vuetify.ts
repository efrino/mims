import { type ThemeDefinition, createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const light: ThemeDefinition = {
  dark: false,
  variables: {
    'border-color': '#f0f0f0',
    'carousel-control-size': 10,
    gradient: 'linear-gradient(250.38deg, #e6f4ff 2.39%, #69b1ff 34.42%, #1677ff 60.95%, #0958d9 84.83%, #002c8c 104.37%)',
    gradient2: 'linear-gradient(to right, rgb(9, 89, 218), rgb(22, 119, 255))',
    'card-shadow': '0px 1px 4px rgba(0, 0, 0, 0.08)',
    'medium-opacity': 0.85,
    'high-opacity': 1
  },
  colors: {
    primary: '#1677ff',
    secondary: '#8c8c8c',
    info: '#13c2c2',
    success: '#52c41a',
    accent: '#FFAB91',
    warning: '#faad14',
    error: '#ff4d4f',
    lightprimary: '#e6f4ff',
    lightsecondary: '#f5f5f5',
    lightsuccess: '#EAFCD4',
    lighterror: '#FFE7D3',
    lightwarning: '#FFF6D0',
    darkText: '#212121',
    lightText: '#8c8c8c',
    darkprimary: '#0277BD',
    darksecondary: '#7a7878',
    borderLight: '#e6ebf1',
    inputBorder: '#a1a1a5',
    containerBg: '#fafafb',
    surface: '#fff',
    'on-surface-variant': '#fff',
    facebook: '#4267b2',
    twitter: '#1da1f2',
    linkedin: '#0e76a8',
    gray100: '#f5f5f5',
    primary200: '#a1d2ff',
    secondary200: '#eeeeee'
  }
};

// Pasangan gelap dari `light`: palet slate sama dengan --wui-* di styles/welding-ui.css.
const dark: ThemeDefinition = {
  dark: true,
  variables: {
    ...light.variables,
    'border-color': '#334155',
    'card-shadow': '0px 1px 4px rgba(0, 0, 0, 0.4)'
  },
  colors: {
    ...light.colors,
    primary: '#3b82f6',
    secondary: '#94a3b8',
    lightprimary: '#1e3a5f',
    lightsecondary: '#273449',
    lightsuccess: '#1f3a1a',
    lighterror: '#4a1d1d',
    lightwarning: '#422006',
    darkText: '#f1f5f9',
    lightText: '#94a3b8',
    darksecondary: '#cbd5e1',
    borderLight: '#334155',
    inputBorder: '#475569',
    containerBg: '#0f172a',
    background: '#0f172a',
    surface: '#1e293b',
    'on-surface-variant': '#1e293b',
    gray100: '#273449',
    primary200: '#1e3a5f',
    secondary200: '#334155'
  }
};

export default createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases: {
      ...aliases
    },
    sets: {
      mdi
    }
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light,
      dark
    }
  },
  defaults: {
    VBtn: {},
    VCard: {
      rounded: 'md'
    },
    VTextField: {
      rounded: 'lg'
    },
    VTooltip: {
      // set v-tooltip default location to top
      location: 'top'
    }
  }
});
