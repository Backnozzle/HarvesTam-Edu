/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        arbol: '#3f4a31',
        arbolHover: '#323c26',
        desierto: '#f3eee0',
      },
      fontFamily: {
        serif: ['"Alegreya"', 'Georgia', 'serif'],
        sans: ['"Alegreya Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};