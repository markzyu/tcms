import * as esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: ["src/main.tsx"],
  bundle: true,
  format: "esm",
  outfile: "dist/app.js",
  jsx: "automatic",
  sourcemap: true,
  minify: !isWatch,
  external: ["path", "fs/promises", "react", "react-dom", "react-dom/client", "react/jsx-runtime", "zod"],
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  const { hosts, port } = await ctx.serve({
    servedir: ".",
    port: 3000,
  });
  console.log(`Dev server running at http://${hosts[0]}:${port}`);
} else {
  await esbuild.build(buildOptions);
}
