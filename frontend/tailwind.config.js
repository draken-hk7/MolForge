/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular']
      },
      colors: {
        forge: {
          bg: '#0a0a0f',
          surface: '#12121a',
          border: '#1e1e2e',
          accent: '#6366f1',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444'
        }
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99,102,241,0.18), 0 18px 70px rgba(0,0,0,0.28)'
      },
      animation: {
        float: 'float 12s ease-in-out infinite',
        flash: 'flash 900ms ease-out'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
          '50%': { transform: 'translate3d(12px, -18px, 0) rotate(5deg)' }
        },
        flash: {
          '0%': { backgroundColor: 'rgba(99,102,241,0.22)' },
          '100%': { backgroundColor: 'transparent' }
        }
      }
    }
  },
  plugins: []
};
