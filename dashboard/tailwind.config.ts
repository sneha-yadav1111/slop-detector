import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        signal: {
          bg:           'var(--signal-bg)',
          surface:      'var(--signal-surface)',
          'surface-2':  'var(--signal-surface-2)',
          border:       'var(--signal-border)',
          'border-hot': 'var(--signal-border-hot)',
          cyan:         'var(--signal-cyan)',
          'cyan-dim':   'var(--signal-cyan-dim)',
          red:          'var(--signal-red)',
          'red-dim':    'var(--signal-red-dim)',
          amber:        'var(--signal-amber)',
          'amber-dim':  'var(--signal-amber-dim)',
          white:        'var(--signal-white)',
          'text-dim':   'var(--signal-text-dim)',
          'text-mute':  'var(--signal-text-mute)',
        },
        /* Keep shadcn semantic tokens pointing at signal tokens */
        background:  'var(--signal-bg)',
        foreground:  'var(--signal-white)',
        border:      'var(--signal-border)',
        input:       'var(--signal-border)',
        ring:        'var(--signal-cyan)',
        card: {
          DEFAULT:    'var(--signal-surface)',
          foreground: 'var(--signal-white)',
        },
        primary: {
          DEFAULT:    'var(--signal-cyan)',
          foreground: 'var(--signal-bg)',
        },
        secondary: {
          DEFAULT:    'var(--signal-surface-2)',
          foreground: 'var(--signal-white)',
        },
        muted: {
          DEFAULT:    'var(--signal-surface)',
          foreground: 'var(--signal-text-dim)',
        },
        accent: {
          DEFAULT:    'var(--signal-surface-2)',
          foreground: 'var(--signal-white)',
        },
        destructive: {
          DEFAULT:    'var(--signal-red)',
          foreground: 'var(--signal-white)',
        },
        popover: {
          DEFAULT:    'var(--signal-surface)',
          foreground: 'var(--signal-white)',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        data:    ['Space Mono', 'monospace'],
        sans:    ['DM Sans', 'sans-serif'],
        mono:    ['Space Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan':  '0 0 16px var(--signal-cyan-glow)',
        'glow-red':   '0 0 16px var(--signal-red-glow)',
        'glow-amber': '0 0 16px var(--signal-amber-glow)',
        card:         '0 2px 16px rgba(0,0,0,0.4)',
      },
      borderRadius: {
        sm:  '2px',
        md:  '4px',
        lg:  '6px',
        xl:  '8px',
        '2xl': '12px',
        full: '9999px',
      },
      keyframes: {
        'signal-sweep': {
          from: { top: '-2px' },
          to:   { top: '100%' },
        },
        'signal-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        'signal-mount': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'score-fill': {
          from: { strokeDashoffset: '100' },
          to:   { strokeDashoffset: '0' },
        },
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
      },
      animation: {
        sweep:          'signal-sweep 3s linear infinite',
        'pulse-slow':   'signal-pulse 2s ease-in-out infinite',
        mount:          'signal-mount 0.4s ease forwards',
        'score-fill':   'score-fill 0.6s ease forwards',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
}

export default config
