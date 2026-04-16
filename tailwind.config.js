/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Primary orange — exact #F4941C from logo ─────────────
        primary: {
          50:  '#fff8ee',
          100: '#ffecd0',
          200: '#ffd49e',
          300: '#ffb860',
          400: '#ff9d30',
          500: '#f4941c',   // ← exact logo orange (sampled)
          600: '#e2850e',
          700: '#b96408',
          800: '#924d08',
          900: '#723c09',
        },
        // ── Brand green — exact #6DB651 from logo ────────────────
        green: {
          50:  '#f1faea',
          100: '#dcf2cc',
          200: '#b8e49a',
          300: '#8ed268',
          400: '#6db651',   // ← exact logo green (sampled)
          500: '#549e3c',
          600: '#3f802c',
          700: '#2e5f20',
          800: '#204518',
          900: '#142e10',
        },
        // ── Navy — exact #0B1928 from logo background ─────────────
        navy: {
          50:  '#e8eef5',
          100: '#c5d2e2',
          200: '#8fa8c8',
          300: '#5a7eaa',
          400: '#2e5888',
          500: '#123660',
          600: '#0f2848',
          700: '#0b1928',   // ← exact logo navy (sampled)
          800: '#07101a',
          900: '#03080e',
        },
        brand: '#f4941c',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
};
