import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1E7D32",
          dark: "#145A22",
          light: "#2B9E44",
        },
        secondary: {
          DEFAULT: "#2E9E44",
          light: "#E8F5E9",
        },
        accent: {
          DEFAULT: "#72D572",
          light: "#C1EBC1",
        },
        background: "#F8FAF8",
        card: "#FFFFFF",
      },
      borderRadius: {
        xl: "16px",
        button: "24px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
