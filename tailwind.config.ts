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
        // ENVOY Design System Tokens — Red Noir Palette
        noir: {
          bg: '#000000',
          dark: '#0a0304',
          card: '#0d0d12',
          surface: '#121218',
          border: 'rgba(255, 255, 255, 0.1)',
        },
        red: {
          accent: '#ef233c',
          glow: 'rgba(239, 35, 60, 0.5)',
          muted: '#8b1725',
        },
        envoy: {
          bg: {
            base: '#000000',
            elevated: '#0a0a0f',
            overlay: '#111118',
            subtle: '#16161f',
            muted: '#1c1c28',
          },
          border: {
            subtle: '#1e1e2e',
            default: '#252535',
            strong: '#333350',
          },
          accent: {
            red: '#ef233c',
            cyan: '#00d4ff',
            'cyan-dim': '#0099cc',
            indigo: '#6366f1',
            'indigo-dim': '#4f52c9',
            purple: '#7c3aed',
            glow: 'rgba(239, 35, 60, 0.15)',
          },
          doc: {
            bg: '#ffffff',
            'bg-off': '#fafafa',
            text: '#0f0f14',
            'text-secondary': '#4b5563',
            border: '#e5e7eb',
          },
          status: {
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef233c',
            info: '#3b82f6',
          },
          text: {
            primary: '#f2f2f7',
            secondary: '#9898b3',
            tertiary: '#5c5c7a',
            disabled: '#3a3a52',
          },
        },
      },
      fontFamily: {
        manrope: ['var(--font-manrope)', 'Manrope', 'sans-serif'],
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
          '0%, 100%': { boxShadow: '0 0 8px rgba(239, 35, 60, 0.4)' },
          '50%': { boxShadow: '0 0 24px rgba(239, 35, 60, 0.7)' },
        },
        'border-spin': {
          from: { '--gradient-angle': '0deg' },
          to: { '--gradient-angle': '360deg' },
        },
        animStar: {
          from: { transform: 'translateY(0px)' },
          to: { transform: 'translateY(-2000px)' },
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
        'border-spin': 'border-spin 2.5s linear infinite',
        animStar: 'animStar 50s linear infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'ai-gradient':
          'linear-gradient(135deg, rgba(239,35,60,0.1) 0%, rgba(10,3,4,0.8) 100%)',
        shimmer:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
      },
      boxShadow: {
        'elevation-1': '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.7)',
        'elevation-2': '0 4px 12px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.5)',
        'elevation-3': '0 8px 28px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.6)',
        'red-glow': '0 0 25px rgba(239,35,60,0.25)',
        'ai-glow': '0 0 0 1px rgba(239,35,60,0.3), 0 0 16px rgba(239,35,60,0.2)',
        'doc-shadow': '0 4px 32px rgba(0,0,0,0.5), 0 1px 8px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [animatePlugin],
}

export default config
