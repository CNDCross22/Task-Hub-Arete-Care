/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'scale-out': {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(0.96)' },
        },
        'progress-slide': {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(420%)' },
        },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'sheet-down': { from: { transform: 'translateY(0)' }, to: { transform: 'translateY(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.15s ease-in forwards',
        'fade-in-up': 'fade-in-up 0.25s ease-out',
        'scale-in': 'scale-in 0.18s ease-out',
        'scale-out': 'scale-out 0.16s ease-in forwards',
        'progress-slide': 'progress-slide 1.1s ease-in-out infinite',
        'sheet-up': 'sheet-up 0.22s ease-out',
        'sheet-down': 'sheet-down 0.18s ease-in forwards',
      },
    },
  },
  plugins: [],
}
