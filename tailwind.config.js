/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        sunken: v('sunken'),
        ink: v('ink'),
        muted: v('muted'),
        line: v('line'),
        primary: v('primary'),
        'on-primary': v('on-primary'),
        lime: v('lime'),
        ok: v('ok'),
        low: v('low'),
        out: v('out'),
        // Colores fijos de la marca (guía de estilo)
        forest: '#1B5E3F',
        leaf: '#4CAF6B',
        cream: '#F5F3EE',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        round: ['ui-rounded', '"SF Pro Rounded"', '"Nunito"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(27 43 33 / 0.04), 0 4px 16px rgb(27 43 33 / 0.05)',
        fab: '0 6px 20px rgb(27 94 63 / 0.35)',
      },
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
      },
      minHeight: { tap: '44px' },
      minWidth: { tap: '44px' },
    },
  },
  plugins: [],
};
