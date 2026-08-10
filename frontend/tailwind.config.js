/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Every color routes through a CSS variable so both themes work
        // without a single hardcoded hex in a component.
        background: 'var(--bg)',
        'background-deep': 'var(--bg-deep)',
        foreground: 'var(--text)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        elevated: 'var(--elevated)',
        sunken: 'var(--sunken)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        'border-accent': 'var(--border-accent)',

        hover: 'var(--hover)',
        'hover-strong': 'var(--hover-strong)',

        // Market values only — never decoration.
        // Declared through RGB channels so opacity modifiers work: `bg-up/10`
        // is used widely and silently produces nothing on a plain var() color.
        up: {
          DEFAULT: 'rgb(var(--up-rgb) / <alpha-value>)',
          bright: 'var(--up-bright)',
          wash: 'var(--up-wash)',
        },
        down: {
          DEFAULT: 'rgb(var(--down-rgb) / <alpha-value>)',
          bright: 'var(--down-bright)',
          wash: 'var(--down-wash)',
        },

        // Legacy aliases, kept so unmigrated pages keep rendering
        emerald: {
          DEFAULT: 'rgb(var(--up-rgb) / <alpha-value>)',
          bright: 'var(--up-bright)',
          dim: 'var(--emerald-dim)',
        },
        coral: {
          DEFAULT: 'rgb(var(--down-rgb) / <alpha-value>)',
          bright: 'var(--down-bright)',
        },
        amber: {
          DEFAULT: 'rgb(var(--warn-rgb) / <alpha-value>)',
        },

        primary: {
          DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
          hover: 'var(--primary-hover)',
          dim: 'var(--primary-dim)',
          wash: 'var(--primary-wash)',
        },
        warn: 'rgb(var(--warn-rgb) / <alpha-value>)',

        muted: 'var(--text-muted)',
        soft: 'var(--text-soft)',
        faint: 'var(--text-faint)',
      },
      fontFamily: {
        sans: ['Inter Tight', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
        display: ['Instrument Serif', 'Times New Roman', 'serif'],
      },
      fontSize: {
        micro: ['10px', { lineHeight: '1.3' }],
        xs: ['11px', { lineHeight: '1.4' }],
        sm: ['12px', { lineHeight: '1.45' }],
        base: ['13px', { lineHeight: '1.5' }],
        md: ['15px', { lineHeight: '1.5' }],
        lg: ['19px', { lineHeight: '1.3' }],
        xl: ['25px', { lineHeight: '1.2' }],
        '2xl': ['33px', { lineHeight: '1.15' }],
        '3xl': ['44px', { lineHeight: '1.08' }],
        hero: ['60px', { lineHeight: '1.02' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '10px',
        xl: '10px',
        '2xl': '14px',
        '3xl': '18px',
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        pop: 'var(--shadow-pop)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-up': 'fadeUp 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'fadeUp 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'marquee-slow': 'marquee 60s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
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
