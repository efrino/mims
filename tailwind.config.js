/** @type {import('tailwindcss').Config} */
import flowbite from 'flowbite/plugin';
import flowbiteTheme from '@themesberg/flowbite/plugin';

export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    './node_modules/flowbite/**/*.js',
    './node_modules/@themesberg/flowbite/**/*.js'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        manrope: ['Manrope', 'sans-serif'],
        se: ['Segoe UI', 'sans-serif']
      }
    }
  },
  plugins: [flowbite, flowbiteTheme]
};
