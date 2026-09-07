import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const domain = process.env.DOMAIN;
const prodHost =
  domain && domain !== "localhost" ? `humi.${domain}` : null;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: prodHost
      ? [prodHost, "localhost", "127.0.0.1"]
      : ["localhost", "127.0.0.1"],
    proxy: {
      "/ws": {
        target: process.env.VITE_GATEWAY_HTTP ?? "http://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
