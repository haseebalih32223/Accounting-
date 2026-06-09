/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lime: {
          accent: '#B8F53A',
          light: '#E8FF8A',
          dark: '#7BC400',
          tint: '#F8FFE8',
        },
        cream: '#F5F5F0',
        dark: {
          DEFAULT: '#1A1A1A',
          2: '#2A2A2A',
          3: '#3A3A3A',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          2: '#6B6B6B',
          3: '#AAAAAA',
        },
        fence: '#EBEBEB',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.10)',
        dropdown: '0 8px 32px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
