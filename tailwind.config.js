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
      boxShadow: {
        // Layered, soft "premium marketplace" shadows
        card:        '0 1px 2px rgba(11,25,40,0.04), 0 2px 8px rgba(11,25,40,0.04)',
        'card-hover':'0 4px 12px rgba(11,25,40,0.08), 0 12px 32px rgba(11,25,40,0.10)',
        float:       '0 8px 30px rgba(11,25,40,0.12)',
        glow:        '0 0 0 3px rgba(244,148,28,0.15)',
        'top-bar':   '0 -8px 24px rgba(11,25,40,0.10)',
      },
      keyframes: {
        'fade-in-up': {
          '0%':   { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'scale-in': {
          '0%':   { opacity: 0, transform: 'scale(0.96)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.45s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':    'fade-in 0.35s ease both',
        'scale-in':   'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up':   'slide-up 0.35s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
};
