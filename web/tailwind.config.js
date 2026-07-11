/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-rounded', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        blush: {
          100: '#ffe4ef',
          200: '#ffc4dd',
          300: '#ff9ec6',
          400: '#f871ac',
          500: '#e94f92',
        },
        ink: {
          900: '#0f0b12',
          800: '#171019',
          700: '#221827',
        },
      },
      keyframes: {
        breathe: {
          '0%,100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.06)', opacity: '1' },
        },
        rise: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        breathe: 'breathe 3.2s ease-in-out infinite',
        rise: 'rise 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};
