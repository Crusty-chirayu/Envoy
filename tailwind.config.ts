import type { Config } from 'tailwindcss'
import animatePlugin from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ENVOY Design System Tokens
        envoy: {
          // Workspace chrome (dark)
          bg: {
            base: '#050507',
            elevated: '#0c0c10',
            overlay: '#111118',
            subtle: '#16161f',
            muted: '#1c1c28',
          },
          // Borders
          border: {
            subtle: '#1e1e2e',
            default: '#252535',
            strong: '#333350',
          },
          // AI Accent — cyan/indigo
          accent: {
            cyan: '#00d4ff',
            'cyan-dim': '#0099cc',
            indigo: '#6366f1',
            'indigo-dim': '#4f52c9',
            purple: '#7c3aed',
            glow: 'rgba(0, 212, 255, 0.12)',
          },
          // Document canvas
          doc: {
            bg: '#ffffff',
            'bg-off': '#fafafa',
            text: '#0f0f14',
            'text-secondary': '#4b5563',
            border: '#e5e7eb',
          },
          // Status colors
          status: {
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6',
          },
          // Text hierarchy
          text: {
            primary: '#f2f2f7',
            secondary: '#9898b3',
            tertiary: '#5c5c7a',
            disabled: '#3a3a52',
          },
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Consolas', 'monospace'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
        document: ['var(--font-document)', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'thinking-dots': {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0, 212, 255, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.6)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.2s ease-out',
        'slide-in-left': 'slide-in-left 0.2s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        pulse: 'pulse 2s ease-in-out infinite',
        'thinking-dots': 'thinking-dots 1.4s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'ai-gradient':
          'linear-gradient(135deg, rgba(0,212,255,0.1) 0%, rgba(99,102,241,0.1) 100%)',
        shimmer:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
      },
      boxShadow: {
        'elevation-1': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)',
        'elevation-2': '0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)',
        'elevation-3': '0 8px 24px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.5)',
        'ai-glow': '0 0 0 1px rgba(0,212,255,0.3), 0 0 16px rgba(0,212,255,0.1)',
        'doc-shadow': '0 4px 32px rgba(0,0,0,0.3), 0 1px 8px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [animatePlugin],
}

export default config
