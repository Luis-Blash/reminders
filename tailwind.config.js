/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#35B36A',
        'primary-dark': '#2E9E5B',
        'primary-light': '#3FBE74',
        'deep-green': '#2E8B57',
        mint: '#EAF5EE',
        surface: '#FFFFFF',
        navy: '#17264A',
        gray: '#6B7280',
        'chip-bg': '#E5F5EC',
        'chip-text': '#2E8B57',
        orange: '#F2794B',
        danger: '#E24B4A',
      },
      borderRadius: {
        card: '18px',
        control: '12px',
      },
    },
  },
  plugins: [],
};
