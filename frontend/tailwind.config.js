/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1F2D3D",
        field: "#F5F7FA",
        line: "#DDE7E1",
        crop: "#1FC77E",
        "crop-dark": "#119D63",
        "crop-light": "#EAFBF3",
        signal: "#119D63"
      },
      boxShadow: {
        soft: "0 12px 35px rgba(31, 45, 61, 0.08)",
        card: "0 18px 45px rgba(31, 45, 61, 0.10)",
        glow: "0 18px 45px rgba(31, 199, 126, 0.28)"
      }
    }
  },
  plugins: []
};
