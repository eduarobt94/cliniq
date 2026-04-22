/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
        serif: ['Instrument Serif', 'ui-serif', 'serif'],
      },
      keyframes: {
        cqModalIn: {
          from: { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
          to:   { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'cq-modal': 'cqModalIn 220ms cubic-bezier(.2,.7,.2,1)',
      },
    },
  },
  plugins: [],
};
