/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(45 100% 50%)',
        accent: 'hsl(204 100% 50%)',
        'industrial-black': 'hsl(0 0% 5%)',
        'industrial-gray': 'hsl(0 0% 15%)',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
