/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        botscrew: {
          50: '#EEF5FB',
          100: '#D6E7F3',
          400: '#3F92CE',
          500: '#2A7DC0',
          600: '#236AA8',
          700: '#1B5689',
        },
        action: {
          500: '#2196F3',
          600: '#1976D2',
        },
        ink: {
          900: '#0B1220',
          800: '#111A2E',
          700: '#1B2742',
          600: '#27365A',
          500: '#3A4A6E',
        },
        success: '#10B981',
        warn: '#F59E0B',
        danger: '#EF4444',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
};
