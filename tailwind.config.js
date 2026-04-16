/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Primary orange (cart, "mart", CTAs) ──────────────────
        primary: {
          50:  '#fff8ec',
          100: '#ffefd0',
          200: '#ffdba0',
          300: '#ffc062',
          400: '#ffa030',
          500: '#f58518',   // logo "mart" orange
          600: '#f06810',
          700: '#c74d08',
          800: '#9e3c08',
          900: '#7c300a',
        },
        // ── Brand green ("epto", leaf) ────────────────────────────
        green: {
          50:  '#f0fce8',
          100: '#dcf8c8',
          200: '#b8f090',
          300: '#8ce058',
          400: '#5cc840',   // logo "epto" green (light)
          500: '#3daa28',   // logo "epto" green (main)
          600: '#2e8b20',
          700: '#226618',
          800: '#1a5010',
          900: '#133c0c',
        },
        // ── Navy dark (backgrounds, sidebars, login) ──────────────
        navy: {
          50:  '#e8edf5',
          100: '#c5d0e0',
          200: '#8fa8c8',
          300: '#5880a8',
          400: '#2a5888',
          500: '#0f3060',
          600: '#0e2040',
          700: '#0b1729',   // logo background navy
          800: '#080f1a',
          900: '#040810',
        },
        brand: '#f58518',
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
