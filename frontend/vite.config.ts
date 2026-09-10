import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const domain = process.env.DOMAIN;
const prodHost = domain && domain !== "localhost" ? `humi.${domain}` : null;

const ipLoggerPlugin = () => ({
  name: "ip-logger-plugin",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const raw =
        req.headers["cf-connecting-ip"] ??
        req.headers["x-real-ip"] ??
        req.headers["x-forwarded-for"] ??
        req.socket.remoteAddress ??
        "-";
      const ip = String(raw).split(",")[0].trim();

      console.log(`[Visitor IP: ${ip}] - ${req.method} ${req.url}`);

      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), ipLoggerPlugin()],
  server: {
    host: true,
    allowedHosts: prodHost ? [prodHost, "localhost", "127.0.0.1"] : ["localhost", "127.0.0.1"],
    proxy: {
      "/ws": {
        target: process.env.VITE_GATEWAY_HTTP ?? "http://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
