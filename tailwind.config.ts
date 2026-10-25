import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAF8F5",
        surface: "#F4EFEA",
        card: "#FFFFFF",
        primary: {
          DEFAULT: "#231124", // deep midnight plum
          50: "#F7F2F7",
          100: "#EEDEEF",
          200: "#D9BBDC",
          300: "#BE91C3",
          400: "#985F9F",
          500: "#6F3776",
          600: "#502456",
          700: "#3B1840",
          800: "#2B112F",
          900: "#1C0A1F",
          950: "#120514",
        },
        accent: {
          DEFAULT: "#E07A5F", // muted coral
          50: "#FDF5F3",
          100: "#FCE8E3",
          200: "#F8CEC4",
          300: "#F2AB9C",
          400: "#E9836E",
          500: "#DE644B",
          600: "#CB4B30",
          700: "#AB3B24",
          800: "#8C3322",
          900: "#742E21",
        },
        gold: {
          DEFAULT: "#C49A45", // warm antique gold
          50: "#FBF8EE",
          100: "#F6F0D8",
          200: "#EBE0B0",
          300: "#DEC882",
          400: "#D1B057",
          500: "#C49A45",
          600: "#A67A32",
          700: "#825C26",
          800: "#6B4922",
          900: "#5A3D1E",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        subtle: "0 2px 10px -2px rgba(35, 17, 36, 0.05), 0 1px 3px -1px rgba(35, 17, 36, 0.03)",
        card: "0 4px 20px -2px rgba(35, 17, 36, 0.06), 0 2px 6px -1px rgba(35, 17, 36, 0.03)",
        elevated: "0 12px 30px -4px rgba(35, 17, 36, 0.1), 0 4px 12px -2px rgba(35, 17, 36, 0.05)",
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      }
    },
  },
  plugins: [],
};
export default config;
