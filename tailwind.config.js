/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './App.tsx', './index.tsx'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#E05726',
          orangeDark: '#b8451f',
          orangeLight: '#ff7340',
          orangeSoft: '#fde3d6',
          navy: '#1a1a2e',
          navyDark: '#0a0a14',
          cream: '#fafaf5',
          creamDark: '#f1ede2',
          ink: '#2a2a3a',
          muted: '#5d6470',
        },
      },
      fontFamily: {
        sans: ['Philosof', 'Almoni', 'Heebo', 'system-ui', 'sans-serif'],
        display: ['Philosof', 'Almoni Tzar', 'Heebo', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
