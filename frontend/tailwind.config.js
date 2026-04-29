/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#bbdfff",
          300: "#8bcbff",
          400: "#54aeff",
          500: "#2d8bff",
          600: "#1669f5",
          700: "#0f54e1",
          800: "#1344b6",
          900: "#163c8f",
          950: "#122657",
        },
      },
    },
  },
  plugins: [],
};
