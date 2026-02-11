/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          0: 'rgb(var(--color-surface-0) / <alpha-value>)',
          1: 'rgb(var(--color-surface-1) / <alpha-value>)',
          2: 'rgb(var(--color-surface-2) / <alpha-value>)',
          3: 'rgb(var(--color-surface-3) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          subtle: 'rgb(var(--color-border-subtle) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover: 'rgb(var(--color-accent-hover) / <alpha-value>)',
          muted: 'rgb(var(--color-accent-muted) / <alpha-value>)',
          foreground: 'rgb(var(--color-accent-fg) / <alpha-value>)',
        },
        foreground: {
          DEFAULT: 'rgb(var(--color-fg) / <alpha-value>)',
          secondary: 'rgb(var(--color-fg-secondary) / <alpha-value>)',
          muted: 'rgb(var(--color-fg-muted) / <alpha-value>)',
        },
        success: {
          DEFAULT: '#16a34a',
          muted: '#dcfce7',
        },
        warning: {
          DEFAULT: '#d97706',
          muted: '#fef3c7',
        },
        error: {
          DEFAULT: '#dc2626',
          muted: '#fee2e2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.03)',
        'lifted': '0 4px 12px -2px rgba(0,0,0,0.08), 0 2px 6px -2px rgba(0,0,0,0.04)',
        'overlay': '0 12px 40px -8px rgba(0,0,0,0.15), 0 4px 16px -4px rgba(0,0,0,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
