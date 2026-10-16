/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#082B60',
          royal: '#1268B3',
          teal: '#079BA9',
          cyan: '#11C4D2',
          gold: '#D7A53B',
          bg: '#F5F8FC',
          darkText: '#172438',
          mutedText: '#66758A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(8, 43, 96, 0.08)',
        'card': '0 2px 12px -1px rgba(8, 43, 96, 0.06), 0 1px 3px rgba(8, 43, 96, 0.04)',
        'elevated': '0 12px 32px -4px rgba(8, 43, 96, 0.12)',
        'gold-glow': '0 0 25px rgba(215, 165, 59, 0.35)',
        'teal-glow': '0 0 25px rgba(7, 155, 169, 0.35)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
