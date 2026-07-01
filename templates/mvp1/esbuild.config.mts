import * as esbuild from "esbuild";
import * as packageJson from "./package.json" with { type: "json" };
import { NODE_MODULES_USED_BY_BUILD_SCHEMA_STEP } from "@pcms/mini-app-common";

const DEPENDENCIES_FROM_LOCAL_CDN = Object.keys(packageJson.dependencies || {})
  .filter((name) => !name.startsWith("@pcms/"));

// @ts-ignore: Some linters complain about browser env. But this will be run in Node.
const isWatch = process.argv.includes("--watch");

const buildOptions: esbuild.BuildOptions = {
  entryPoints: ["src/main.tsx"],
  bundle: true,
  format: "esm",
  outfile: "dist/app.js",
  jsx: "automatic",
  sourcemap: true,
  minify: !isWatch,
  external: [
    ...NODE_MODULES_USED_BY_BUILD_SCHEMA_STEP,
    ...DEPENDENCIES_FROM_LOCAL_CDN,
  ],
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
