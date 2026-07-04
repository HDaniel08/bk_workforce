import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F5EBDC",
        brown: "#502314",
        red: "#D72300",
        green: "#2C862F"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(80, 35, 20, 0.12)"
      }
    }
  },
  plugins: []
} satisfies Config;
