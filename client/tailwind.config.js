/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens for components
        background: '#ffffff',
        foreground: '#212121',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#212121',
        },
        popover: {
          DEFAULT: '#ffffff',
          foreground: '#212121',
        },
        muted: {
          DEFAULT: '#f5f5f5',
          foreground: '#757575',
        },
        border: '#e0e0e0',
        input: '#e0e0e0',
        ring: '#0F5D5D',
        
        // Primary Colors (Dark Teal - Brand Color)
        primary: {
          50: '#e6f2f2',
          100: '#b3d9d9',
          200: '#80c0c0',
          300: '#4da7a7',
          400: '#268e8e',
          500: '#0F5D5D', // Main brand color - Dark Teal
          600: '#0c4a4a',
          700: '#093737',
          800: '#062424',
          900: '#031111',
          DEFAULT: '#0F5D5D',
          dark: '#093737',
          foreground: '#ffffff',
        },
        // Secondary Colors
        secondary: {
          DEFAULT: '#f5f5f5',
          foreground: '#212121',
        },
        // Accent Colors (Orange/Amber)
        accent: {
          50: '#fff3e0',
          100: '#ffe0b2',
          200: '#ffcc80',
          300: '#ffb74d',
          400: '#ffa726',
          500: '#ff9800',
          600: '#fb8c00',
          700: '#f57c00',
          800: '#ef6c00',
          900: '#e65100',
          DEFAULT: '#ff9800',
          foreground: '#ffffff',
        },
        // Semantic Colors
        success: {
          DEFAULT: '#4caf50',
          dark: '#388e3c',
          light: '#81c784',
        },
        warning: {
          DEFAULT: '#ff9800',
          dark: '#f57c00',
          light: '#ffb74d',
        },
        error: {
          DEFAULT: '#f44336',
          dark: '#d32f2f',
          light: '#e57373',
        },
        info: {
          DEFAULT: '#2196f3',
          dark: '#1976d2',
          light: '#64b5f6',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'slide-up-fade': {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slideInUp': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-bounce': {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'scaleIn': {
          '0%': { opacity: '0', transform: 'scale(0)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'cinematic-rise': {
          '0%': { opacity: '0', transform: 'translateY(60px) scale(0.9)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out',
        'fadeIn': 'fadeIn 0.5s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'slide-up-fade': 'slide-up-fade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slideInUp': 'slideInUp 0.5s ease-out',
        'scale-bounce': 'scale-bounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'scaleIn': 'scaleIn 0.5s ease-out',
        'cinematic-rise': 'cinematic-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'pulse-slow': 'pulse-slow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
