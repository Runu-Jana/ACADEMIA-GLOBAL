import type { Config } from 'tailwindcss'
// ESM import, not require() — Node 25 loads this .ts config as an ES module,
// where require() is undefined and crashes the dev server on first use.
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1360px' },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'var(--font-inter)', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: 'hsl(var(--surface))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#eff5ff',
          100: '#dbe8fe',
          200: '#bfd7fe',
          300: '#93bcfd',
          400: '#6096fa',
          500: '#3b76f6',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172d6e',
          950: '#101c44',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Holographic accent ramp — used for glows, rings and gradient text.
        holo: {
          cyan: '#22d3ee',
          sky: '#38bdf8',
          indigo: '#818cf8',
          violet: '#8b5cf6',
          fuchsia: '#e879f9',
          mint: '#5eead4',
        },
        accent: {
          orange: '#f97316',
          green: '#10b981',
          pink: '#ec4899',
          amber: '#f59e0b',
        },
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '13': '3.25rem',
        '18': '4.5rem',
        '112': '28rem',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,28,68,.04), 0 4px 16px rgba(16,28,68,.06)',
        card: '0 2px 4px rgba(16,28,68,.04), 0 12px 32px -8px rgba(16,28,68,.12)',
        lift: '0 8px 16px rgba(16,28,68,.08), 0 24px 48px -12px rgba(16,28,68,.18)',
        glow: '0 0 0 1px rgba(59,118,246,.18), 0 8px 32px -4px rgba(59,118,246,.35)',
        'glow-holo': '0 0 24px -4px rgba(139,92,246,.45), 0 0 48px -12px rgba(34,211,238,.35)',
        inner_top: 'inset 0 1px 0 rgba(255,255,255,.6)',
      },
      backgroundImage: {
        // Restrained navy → blue → indigo. Keeps depth without the rainbow.
        'holo-sweep':
          'linear-gradient(120deg,#1e40af 0%,#2563eb 42%,#4f46e5 78%,#6366f1 100%)',
        'brand-fade': 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 55%,#3b76f6 100%)',
        'glass-sheen':
          'linear-gradient(180deg,rgba(255,255,255,.65) 0%,rgba(255,255,255,.15) 40%,rgba(255,255,255,0) 100%)',
      },
      keyframes: {
        'holo-spin': { to: { '--holo-angle': '360deg' } },
        'gradient-x': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        // Gentle ambient drift for the hero cards — slow and small enough to
        // read as "alive" rather than "blinking".
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-7px)' },
        },
        // Translate only — scaling a heavily blurred layer forces the
        // compositor to re-rasterize the blur on every frame.
        'float-slow': {
          '0%,100%': { transform: 'translate3d(0,0,0)' },
          '33%': { transform: 'translate3d(26px,-20px,0)' },
          '66%': { transform: 'translate3d(-20px,14px,0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-120%) skewX(-18deg)' },
          '100%': { transform: 'translateX(220%) skewX(-18deg)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(.94)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        // Opacity-only for the same reason — these sit on blurred elements.
        'pulse-glow': {
          '0%,100%': { opacity: '.4' },
          '50%': { opacity: '.85' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.25' } },
      },
      animation: {
        'holo-spin': 'holo-spin 6s linear infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        float: 'float 7s ease-in-out infinite',
        'float-slow': 'float-slow 18s ease-in-out infinite',
        shimmer: 'shimmer 2.4s ease-in-out infinite',
        'fade-up': 'fade-up .6s cubic-bezier(.22,1,.36,1) both',
        'scale-in': 'scale-in .45s cubic-bezier(.22,1,.36,1) both',
        'pulse-glow': 'pulse-glow 4.5s ease-in-out infinite',
        marquee: 'marquee 32s linear infinite',
        'spin-slow': 'spin-slow 14s linear infinite',
        blink: 'blink 1.4s ease-in-out infinite',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(.22,1,.36,1)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
