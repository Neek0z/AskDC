/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(214, 15%, 83%)",
        input: "hsl(214, 15%, 83%)",
        ring: "hsl(222.2, 84%, 56%)",
        background: "#ffffff",
        foreground: "#020817",
        primary: {
          DEFAULT: "#1d4ed8",
          foreground: "#f9fafb"
        },
        secondary: {
          DEFAULT: "#e5e7eb",
          foreground: "#111827"
        },
        destructive: {
          DEFAULT: "#b91c1c",
          foreground: "#f9fafb"
        },
        muted: {
          DEFAULT: "#f3f4f6",
          foreground: "#4b5563"
        },
        accent: {
          DEFAULT: "#eff6ff",
          foreground: "#1d4ed8"
        }
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem"
      }
    }
  },
  plugins: []
};

