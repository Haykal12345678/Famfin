/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          500: '#3b5bdb',
          600: '#2f47b0',
          700: '#25378a',
        },
      },
    },
  },
  plugins: [],
};
