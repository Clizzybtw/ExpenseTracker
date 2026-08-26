/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        text: {
          DEFAULT: 'var(--text)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          faint: 'var(--text-faint)',
        },
        accent: { DEFAULT: 'var(--accent)', hover: 'var(--accent-hover)', subtle: 'var(--accent-subtle)' },
        ok: 'var(--ok)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        sans: ['Public Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: '11px',
        sm: '12.5px',
        base: '14px',
        lg: '18px',
        xl: '24px',
        '2xl': '32px',
      },
      borderRadius: { DEFAULT: '6px', lg: '12px' },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.4)',
        modal: '0 16px 48px rgb(0 0 0 / 0.6)',
      },
      spacing: { 11: '44px' },
    },
  },
  plugins: [],
};
