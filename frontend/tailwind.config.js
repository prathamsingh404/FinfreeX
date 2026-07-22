/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        foreground: 'var(--text)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        elevated: 'var(--elevated)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        // Market values only — never decoration
        emerald: {
          DEFAULT: 'rgb(34 160 107 / <alpha-value>)',
          bright: 'rgb(43 189 128 / <alpha-value>)',
          dim: 'rgb(23 113 75 / <alpha-value>)',
        },
        coral: {
          DEFAULT: 'rgb(225 75 75 / <alpha-value>)',
          bright: 'rgb(239 95 95 / <alpha-value>)',
        },
        amber: {
          DEFAULT: 'rgb(201 138 30 / <alpha-value>)',
        },
        // The single accent
        primary: 'rgb(59 125 252 / <alpha-value>)',
        muted: 'var(--text-muted)',
        soft: 'var(--text-soft)',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '10px',
        '2xl': '12px',
        '3xl': '16px',
      },
      animation: {
        'fade-up': 'fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'marquee-slow': 'marquee 60s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
