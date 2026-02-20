import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: ["../../apps/web/src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1B8A4C",
        secondary: "#2E74B5",
        background: "#F8FAFC",
      },
    },
  },
  plugins: [],
}

export default config
