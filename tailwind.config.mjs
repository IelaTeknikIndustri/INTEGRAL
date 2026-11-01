/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#121826',
          cobalt: '#2563EB',
          indigo: '#4F46E5',
          violet: '#7C3AED',
          jade: '#0D9488',
          coral: '#F97316',
          amber: '#F59E0B',
          surface: '#1E293B',
          canvas: '#F8FAFC'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'serif']
      }
    }
  },
  plugins: []
};

