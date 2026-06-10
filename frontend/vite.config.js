import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("@stripe")) {
            return "stripe";
          }
          if (id.includes("recharts")) {
            return "charts";
          }
          if (id.includes("react-simple-maps") || id.includes("d3-geo") || id.includes("topojson")) {
            return "maps";
          }
          if (id.includes("framer-motion")) {
            return "motion";
          }
          if (id.includes("html5-qrcode")) {
            return "qr";
          }
          if (id.includes("swiper")) {
            return "swiper";
          }
          return undefined;
        }
      }
    }
  }
});
