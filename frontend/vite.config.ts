import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      "/ws": {
        target: process.env.VITE_GATEWAY_HTTP ?? "http://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
