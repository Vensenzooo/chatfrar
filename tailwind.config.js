/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
      },
      animation: {
        'bounce-short': 'bounce 0.5s ease-in-out infinite',
      },
      boxShadow: {
        'chat': '0 2px 8px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
