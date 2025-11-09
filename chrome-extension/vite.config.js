import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tailwindcss from "@tailwindcss/vite";
import webExtension from "vite-plugin-web-extension";

export default defineConfig({
  mode: "development",
  root: "./src",
  plugins: [
    tailwindcss(),
    react(),
    webExtension({
      manifest: './manifest.json'
    }),
    // viteStaticCopy({
    //   targets: [
    //     {
    //       src: 'manifest.json',
    //       dest: '.'
    //     }
    //   ]
    // })
  ],
  build: {
    outDir: '../dist',
    sourcemap: true,
    rollupOptions: {
      // input: {
      //   popup: "src/popup/index.html",
      //   content: "src/content/content.js",
      //   background: 'src/background/background.js',
      // },
      // output: {
      //   entryFileNames: "[name].js",
      // }
    }
  }
})
