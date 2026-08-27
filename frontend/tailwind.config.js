/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B5A54',
          dark: '#08423D',
          light: '#14B8A6',
          tint: '#E3F3F1',
        },
        app: {
          bg: '#EEF1F6',
          surface: '#FFFFFF',
          border: '#E4E7EC',
        },
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          tertiary: '#9CA3AF',
        },
        status: {
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#DC2626',
          infoTint: '#DCEEFB',
        }
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      borderRadius: {
        'sm': '10px',
        'md': '16px',
        'lg': '24px',
        'pill': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(16, 24, 40, 0.05)',
        'md': '0 4px 12px rgba(16, 24, 40, 0.08)',
        'lg': '0 8px 24px rgba(16, 24, 40, 0.12)',
      },
      backgroundImage: {
        'gradient-teal': 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
        'gradient-primary': 'linear-gradient(135deg, #0B5A54 0%, #14B8A6 100%)',
      }
    },
  },
  plugins: [],
}
