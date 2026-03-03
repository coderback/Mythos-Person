import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: '#c9a84c',
        cream: '#f5e6c8',
        navy: '#0a0a1a',
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        garamond: ['EB Garamond', 'serif'],
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'pulse-gold': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-slide': 'fadeSlide 0.4s ease-out forwards',
      },
      keyframes: {
        fadeSlide: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
