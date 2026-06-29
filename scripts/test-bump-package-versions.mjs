#!/usr/bin/env node
/**
 * Integration tests for bump-package-versions.mjs using temporary demo packages.
 *
 * Requires a clean working tree (no staged or unstaged changes). Creates
 * packages/demo-a and packages/demo-b, runs tests, then removes them.
 * 
 * Any commits created during the run are cleaned up by cleanupDemoPackages().
 */
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
process.chdir(ROOT);

const DEMO_PACKAGES = ["demo-a", "demo-b"];
const VERSION_BUMP_PENDING_FLAG = join(ROOT, ".git/pcms-version-bump-pending");

function assertCleanWorkingTree() {
  const status = execSync("git status --porcelain", { encoding: "utf8" }).trim();
  if (status) {
    console.error(
      "test-bump-package-versions: working tree must be clean (no staged or unstaged changes)",
    );
    console.error(status);
    process.exit(1);
  }
}

function createDemoPackages() {
  for (const pkg of DEMO_PACKAGES) {
    const pkgRoot = join(ROOT, "packages", pkg);
    mkdirSync(join(pkgRoot, "src"), { recursive: true });
  }

  writeFileSync(
    join(ROOT, "packages/demo-a/package.json"),
    `${JSON.stringify({ name: "@pcms/demo-a", version: "1.0.0", private: true }, null, 2)}\n`,
  );
  writeFileSync(
    join(ROOT, "packages/demo-b/package.json"),
    `${JSON.stringify({ name: "@pcms/demo-b", version: "2.1.3", private: true }, null, 2)}\n`,
  );
  writeFileSync(join(ROOT, "packages/demo-a/src/index.ts"), 'export const demoA = "hello";\n');
  writeFileSync(join(ROOT, "packages/demo-b/src/index.ts"), 'export const demoB = "world";\n');
}

function resetVersions() {
  writeFileSync(
    join(ROOT, "packages/demo-a/package.json"),
    `${JSON.stringify({ name: "@pcms/demo-a", version: "1.0.0", private: true }, null, 2)}\n`,
  );
  writeFileSync(
    join(ROOT, "packages/demo-b/package.json"),
    `${JSON.stringify({ name: "@pcms/demo-b", version: "2.1.3", private: true }, null, 2)}\n`,
  );
}

function cleanupDemoPackages() {
  try {
    execSync("git reset HEAD", { cwd: ROOT });
  } catch {
    // ignore if nothing staged
  }

  for (const pkg of DEMO_PACKAGES) {
    rmSync(join(ROOT, "packages", pkg), { recursive: true, force: true });
  }

  if (existsSync(VERSION_BUMP_PENDING_FLAG)) {
    unlinkSync(VERSION_BUMP_PENDING_FLAG);
  }
}

function readVersion(pkg) {
  const path = join(ROOT, `packages/${pkg}/package.json`);
  return JSON.parse(readFileSync(path, "utf8")).version;
}

function stage(paths) {
  execSync(`git add -- ${paths.join(" ")}`, { cwd: ROOT });
}

function unstageAll() {
  execSync("git reset HEAD", { cwd: ROOT });
}

function runBump(subject) {
  const dir = mkdtempSync(join(tmpdir(), "pcms-commit-msg-"));
  const msgFile = join(dir, "msg.txt");
  writeFileSync(msgFile, subject);

  try {
    const output = execSync(`node scripts/bump-package-versions.mjs ${msgFile}`, {
      cwd: ROOT,
      encoding: "utf8",
    });
    return { code: 0, output };
  } catch (error) {
    return {
      code: error.status ?? 1,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assertCleanWorkingTree();
createDemoPackages();

try {
  test("feat bumps demo-a patch (1.0.0 → 1.0.1)", () => {
    resetVersions();
    unstageAll();
    stage(["packages/demo-a/src/index.ts"]);
    const result = runBump("feat: add demo-a export");
    assert(result.code === 0, `expected exit 0, got ${result.code}: ${result.output}`);
    assert(readVersion("demo-a") === "1.0.1", `version is ${readVersion("demo-a")}`);
  });

  test("feat! bumps demo-a minor (1.0.0 → 1.1.0)", () => {
    resetVersions();
    unstageAll();
    stage(["packages/demo-a/src/index.ts"]);
    const result = runBump("feat!: breaking demo-a export");
    assert(result.code === 0, `expected exit 0, got ${result.code}: ${result.output}`);
    assert(readVersion("demo-a") === "1.1.0", `version is ${readVersion("demo-a")}`);
  });

  test("fix bumps demo-a patch (reset 1.0.0 → 1.0.1)", () => {
    resetVersions();
    unstageAll();
    writeFileSync(join(ROOT, "packages/demo-a/src/index.ts"), 'export const demoA = "fixed";\n');
    stage(["packages/demo-a/src/index.ts"]);
    const result = runBump("fix: correct demo-a export");
    assert(result.code === 0, `expected exit 0, got ${result.code}: ${result.output}`);
    assert(readVersion("demo-a") === "1.0.1", `version is ${readVersion("demo-a")}`);
  });

  test("chore does not bump", () => {
    resetVersions();
    unstageAll();
    writeFileSync(join(ROOT, "packages/demo-a/src/index.ts"), 'export const demoA = "chore";\n');
    stage(["packages/demo-a/src/index.ts"]);
    const result = runBump("chore: tooling");
    assert(result.code === 0, `expected exit 0, got ${result.code}`);
    assert(readVersion("demo-a") === "1.0.0", `version is ${readVersion("demo-a")}`);
  });

  test("unknown type blah fails", () => {
    resetVersions();
    unstageAll();
    stage(["packages/demo-a/src/index.ts"]);
    const result = runBump("blah: readme");
    assert(result.code !== 0, "expected non-zero exit");
    assert(result.output.includes("unknown commit type"), result.output);
    assert(readVersion("demo-a") === "1.0.0", `version is ${readVersion("demo-a")}`);
  });

  test("non-conventional message fails", () => {
    resetVersions();
    unstageAll();
    stage(["packages/demo-a/src/index.ts"]);
    const result = runBump("wip stuff");
    assert(result.code !== 0, "expected non-zero exit");
    assert(result.output.includes("conventional commit"), result.output);
  });

  test("feat bumps both packages when both have staged src changes", () => {
    resetVersions();
    unstageAll();
    writeFileSync(join(ROOT, "packages/demo-a/src/index.ts"), 'export const demoA = "both";\n');
    writeFileSync(join(ROOT, "packages/demo-b/src/index.ts"), 'export const demoB = "both";\n');
    stage(["packages/demo-a/src/index.ts", "packages/demo-b/src/index.ts"]);
    const result = runBump("feat: update both demos");
    assert(result.code === 0, `expected exit 0: ${result.output}`);
    assert(readVersion("demo-a") === "1.0.1", `demo-a is ${readVersion("demo-a")}`);
    assert(readVersion("demo-b") === "2.1.4", `demo-b is ${readVersion("demo-b")}`);
  });

  test("README change alone does not bump", () => {
    resetVersions();
    unstageAll();
    writeFileSync(join(ROOT, "packages/demo-a/README.md"), "# Demo A\n");
    stage(["packages/demo-a/README.md"]);
    const result = runBump("feat: docs only");
    assert(result.code === 0, `expected exit 0`);
    assert(readVersion("demo-a") === "1.0.0", `version is ${readVersion("demo-a")}`);
  });
} finally {
  cleanupDemoPackages();
}

const failed = results.filter((r) => !r.ok);
console.log("");
console.log(`${results.length - failed.length}/${results.length} passed`);

if (failed.length > 0) {
  process.exit(1);
}
