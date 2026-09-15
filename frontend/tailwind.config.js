/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#0B0F14',
          surface: '#141A22',
          elevated: '#1C242E',
        },
        border: {
          subtle: '#2A3542',
        },
        rail: {
          primary: '#E6EDF3',
          secondary: '#9BA8B7',
          accent: '#22D3A7',
          watch: '#F2C94C',
          warning: '#F2994A',
          critical: '#EF4444',
          info: '#4F9CF9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

