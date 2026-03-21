/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#E27289",
        secondary: "#F0956A",
        background: "#FFFFFF",
        surface: "#FFF5F7",
        text: "#2C2C2A",
        muted: "#888780",
        success: "#8A9F79",
        warning: "#FFD12F",
      },
    },
  },
  plugins: [],
};
