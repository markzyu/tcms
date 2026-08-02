/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { visualizer } from 'rollup-plugin-visualizer';
import process from "node:process";
import vue from "@vitejs/plugin-vue";
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [
    vue(),
    visualizer({ 
      open: false, 
      filename: 'dist/bundle-size-analysis.html',
      gzipSize: true 
    })
  ],

  build: {
    // Ionic takes up 1MB. For now, we don't expect anything else to take 1MB.
    chunkSizeWarningLimit: 2048,
    // This sets the browser compatibility target for the production build
    target: 'es2021'
  },

  // This is needed during dev mode
  optimizeDeps: {
    rolldownOptions: {
      transform: {
        target: 'es2021'
      }
    }
  },
  esbuild: {
    target: 'es2021'
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  test: {
    environment: "jsdom",
    setupFiles: ["./src/vitest.setup.ts"],
    globals: true,
    coverage: {
      provider: "v8" as const,
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,vue}"],
      exclude: [
        "src/**/*.spec.ts",
        "src/**/*.d.ts",
        "src/main.ts",
        "src/vite-env.d.ts",
        "src/vitest.setup.ts",
        "src/testUtils.ts",
      ],
    },
  },

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
