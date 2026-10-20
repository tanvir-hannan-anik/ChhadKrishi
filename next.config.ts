import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Overridable so an isolated test server can run beside the normal dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // PGlite loads its WASM/data files from node_modules at runtime; don't bundle it.
  serverExternalPackages: ["@electric-sql/pglite"],
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
