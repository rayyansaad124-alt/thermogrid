/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Space-themed dark palette
        space: {
          950: '#030414',
          900: '#070b1f',
          800: '#0d1230',
          700: '#161b42',
          600: '#1f2658',
          500: '#2a3270',
        },
        // Thermo accent colors
        thermo: {
          orange: '#f97316',
          red: '#ef4444',
          amber: '#f59e0b',
          cyan: '#06b6d4',
          emerald: '#10b981',
        },
      },
    },
  },
  plugins: [],
};
