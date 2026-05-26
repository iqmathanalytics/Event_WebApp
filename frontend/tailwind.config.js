/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff1f2",
          100: "#ffe4e6",
          500: "#f43f5e",
          600: "#e11d48",
          700: "#be123c"
        }
      },
      boxShadow: {
        soft: "0 8px 30px rgba(15, 23, 42, 0.08)"
      },
      keyframes: {
        "ticket-shine": {
          "0%": { transform: "translateX(-120%) skewX(-14deg)", opacity: "0" },
          "12%": { opacity: "0.85" },
          "100%": { transform: "translateX(220%) skewX(-14deg)", opacity: "0" }
        }
      },
      animation: {
        "ticket-shine": "ticket-shine 3.8s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
