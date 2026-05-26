import { copyFileSync } from "node:fs"
import { resolve } from "node:path"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

function spaFallback(): Plugin {
  return {
    name: "spa-fallback-404",
    apply: "build",
    closeBundle() {
      const dist = resolve(__dirname, "dist")
      copyFileSync(resolve(dist, "index.html"), resolve(dist, "404.html"))
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback()],
  resolve: {
    tsconfigPaths: true,
  },
  base: "/",
})
