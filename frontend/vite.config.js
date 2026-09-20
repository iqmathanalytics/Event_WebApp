import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function posixPath(id) {
  return id.replace(/\\/g, "/");
}

function isReactCore(id) {
  const n = posixPath(id);
  return (
    n.includes("/node_modules/react-dom/") ||
    n.includes("/node_modules/react/") ||
    n.includes("/node_modules/scheduler/")
  );
}

export default defineConfig({
  plugins: [react()],
  build: {
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!posixPath(id).includes("/node_modules/")) {
            return undefined;
          }
          // Claim React before Recharts so react-dom is not swallowed by the charts chunk
          // and preloaded on every route.
          if (isReactCore(id)) {
            return "react";
          }
          if (id.includes("@stripe")) {
            return "stripe";
          }
          if (id.includes("recharts")) {
            return "charts";
          }
          if (id.includes("react-simple-maps") || id.includes("d3-geo") || id.includes("d3-scale") || id.includes("topojson")) {
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
          if (id.includes("@seatsio")) {
            return "seatsio";
          }
          if (id.includes("@tiptap") || posixPath(id).includes("/prosemirror")) {
            return "editor";
          }
          if (id.includes("react-datepicker")) {
            return "datepicker";
          }
          return undefined;
        }
      }
    }
  }
});
