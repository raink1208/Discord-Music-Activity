import { build } from "esbuild";

await build({
  entryPoints: ["src/index.js"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outfile: "dist/bundle.cjs",
  minify: false,
  sourcemap: false,
  // discord-rpc の register.js が動的に require するため外部化不要
  // socket.io-client も全てバンドル
  banner: {
    js: "// Discord Music Status - Bundled with esbuild",
  },
});

console.log("✓ dist/bundle.cjs にバンドルしました");
