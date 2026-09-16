/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'card-red': '#ef4444',
        'card-blue': '#3b82f6',
        'card-green': '#10b981',
        'card-yellow': '#f59e0b',
        'table-felt': '#0f382c',
        'table-wood': '#1f1610'
      },
      animation: {
        'bounce-short': 'bounce 0.5s ease-in-out 1',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-up': 'floatUp 2.5s ease-out forwards'
      },
      keyframes: {
        floatUp: {
          '0%': { transform: 'translateY(0) scale(0.8)', opacity: '1' },
          '100%': { transform: 'translateY(-120px) scale(1.4)', opacity: '0' }
        }
      }
    },
  },
  plugins: [],
}
