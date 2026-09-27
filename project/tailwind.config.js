/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4fa',
          100: '#d9e2f1',
          200: '#b3c5e3',
          300: '#8da6d4',
          400: '#5e7fbf',
          500: '#3a5ba0',
          600: '#2a4480',
          700: '#1e3260',
          800: '#152447',
          900: '#0d1a36',
          950: '#080f24',
        },
        gold: {
          400: '#3a5ba0',
          500: '#2a4480',
          600: '#1e3260',
        },
      },
    },
  },
  plugins: [],
};
