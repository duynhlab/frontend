import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// All API traffic goes cross-origin to the Kong gateway (VITE_API_BASE_URL,
// baked at build time) — there is no dev proxy and no /api prefix anywhere.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Mock mode is a local development tool only. A production bundle with the
  // in-app mock enabled would silently serve fake data — refuse to build it.
  if (mode === "production" && env.VITE_USE_MOCK === "true") {
    throw new Error("Refusing production build with VITE_USE_MOCK=true");
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      port: 3000,
    },
  };
});
