/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hawk: {
          primary: '#00D4FF',
          secondary: '#7B61FF',
          dark: '#0A0E27',
          darker: '#050814',
        },
      },
    },
  },
  plugins: [],
}
