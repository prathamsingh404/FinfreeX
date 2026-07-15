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
        // Brand (rgb + <alpha-value> so /NN opacity modifiers work)
        emerald: {
          DEFAULT: 'rgb(8 153 129 / <alpha-value>)',
          bright: 'rgb(12 195 165 / <alpha-value>)',
          dim: 'rgb(5 107 90 / <alpha-value>)',
        },
        coral: {
          DEFAULT: 'rgb(242 54 69 / <alpha-value>)',
          bright: 'rgb(255 77 90 / <alpha-value>)',
        },
        amber: {
          DEFAULT: 'rgb(217 147 13 / <alpha-value>)',
        },
        primary: 'rgb(41 98 255 / <alpha-value>)',
        muted: 'var(--text-muted)',
        soft: 'var(--text-soft)',
        ai: {
          DEFAULT: 'rgb(124 106 255 / <alpha-value>)',
          bright: 'rgb(157 139 255 / <alpha-value>)',
          dim: 'rgb(77 63 214 / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
        '3xl': '28px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'marquee-slow': 'marquee 60s linear infinite',
        'spin-slow': 'spinSlow 18s linear infinite',
        'agent-pulse': 'agentPulse 1.8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        agentPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(124, 106, 255, 0.35)' },
          '50%': { boxShadow: '0 0 0 6px rgba(124, 106, 255, 0)' },
        },
      },
    },
  },
  plugins: [],
}
