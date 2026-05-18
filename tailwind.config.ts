import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#6C3FE8',
          pink:   '#E84393',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          soft:    '#F8F7FF',
        },
        ink: {
          DEFAULT: '#1A1A2E',
          muted:   '#6B7280',
          faint:   '#9CA3AF',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6C3FE8 0%, #E84393 100%)',
      },
      boxShadow: {
        'brand':    '0 8px 24px rgba(108,63,232,.25)',
        'brand-sm': '0 4px 12px rgba(108,63,232,.15)',
        'card':     '0 1px 3px rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.04)',
        'card-md':  '0 4px 16px rgba(108,63,232,.10), 0 1px 4px rgba(0,0,0,.06)',
      },
      borderRadius: {
        '2.5xl': '20px',
      },
    },
  },
  plugins: [],
}

export default config
