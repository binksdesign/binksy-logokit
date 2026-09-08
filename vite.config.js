import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
export default defineConfig({
  build: { target: "esnext", chunkSizeWarningLimit: 1500 },
  plugins: [
    {
      name: "offline-cache",
      generateBundle(_, bundle) {
        const files = [
          "/",
          "/fonts/ClashDisplay-Variable.woff2",
          "/brand/logokit.svg",
          "/brand/arrow.svg",
          "/brand/favicon.svg",
          ...Object.keys(bundle)
            .filter((n) => /\.(js|css)$/.test(n))
            .map((n) => "/" + n),
        ];
        const source = readFileSync("public/sw.js", "utf8").replace(
          '"__PRECACHE__"',
          JSON.stringify(files).slice(1, -1),
        );
        this.emitFile({ type: "asset", fileName: "sw.js", source });
      },
    },
  ],
});
