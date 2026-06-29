#!/usr/bin/env node
/**
 * commit-msg hook: validate message and bump packages/* versions when:
 * - Staged changes include relevant files in a package
 * - Commit message type is feat! (minor), feat (patch), or fix (patch)
 * Skips chore, refactor, and test commits.
 * Rejects unknown or non-conventional commit types (exits non-zero).
 * Bumped package.json files are git add'd; post-commit amends the commit to include them.
 * Skipped with git commit --no-verify.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PACKAGES_DIR = "packages";
const VERSION_BUMP_PENDING_FLAG = ".git/pcms-version-bump-pending";
const SKIP_TYPES = new Set(["chore", "refactor", "test"]);
const BUMP_TYPES = new Set(["feat!", "feat", "fix"]);
const ALLOWED_TYPES = new Set([...SKIP_TYPES, ...BUMP_TYPES]);

function getStagedFiles() {
  const output = execSync("git diff --cached --name-only --diff-filter=ACMR", {
    encoding: "utf8",
  });
  return output.split("\n").filter(Boolean);
}

function packageNameFromPath(filePath) {
  const match = filePath.match(/^packages\/([^/]+)\//);
  return match?.[1] ?? null;
}

function packageJsonHasNonVersionChanges(packageName) {
  const diff = execSync(`git diff --cached -- ${PACKAGES_DIR}/${packageName}/package.json`, {
    encoding: "utf8",
  });
  if (!diff) {
    return false;
  }

  for (const line of diff.split("\n")) {
    if (!line.startsWith("+") && !line.startsWith("-")) {
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }
    const content = line.slice(1);
    if (content.includes('"version"')) {
      continue;
    }
    return true;
  }

  return false;
}

function isRelevantPackageChange(packageName, filePath) {
  const prefix = `${PACKAGES_DIR}/${packageName}/`;
  if (!filePath.startsWith(prefix)) {
    return false;
  }

  const relativePath = filePath.slice(prefix.length);

  if (relativePath === "package.json") {
    return packageJsonHasNonVersionChanges(packageName);
  }
  if (relativePath.endsWith(".md")) {
    return false;
  }
  if (relativePath.startsWith("dist/")) {
    return false;
  }

  return true;
}

function getSubjectLine(message) {
  for (const line of message.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    return trimmed;
  }
  return "";
}

function parseCommitType(subject) {
  if (/^feat(?:\([^)]+\))?!:/.test(subject)) {
    return "feat!";
  }
  const match = subject.match(/^(\w+)(?:\([^)]+\))?:/);
  return match?.[1] ?? null;
}

function fail(message) {
  console.error(`bump-package-versions: ${message}`);
  process.exit(1);
}

function bumpVersion(version, commitType) {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid semver in package.json: ${version}`);
  }

  const [major, minor, patch] = parts;

  if (commitType === "feat!") {
    return `${major}.${minor + 1}.0`;
  }
  if (commitType === "feat" || commitType === "fix") {
    return `${major}.${minor}.${patch + 1}`;
  }

  return version;
}

function stagePackageJson(packageJsonPath) {
  execSync(`git add -- "${packageJsonPath}"`);
}

const commitMessagePath = process.argv[2];
if (!commitMessagePath) {
  process.exit(0);
}

const message = readFileSync(commitMessagePath, "utf8");
const subject = getSubjectLine(message);

if (!subject) {
  fail("commit message must have a subject line");
}

const commitType = parseCommitType(subject);

if (!commitType) {
  fail(
    "commit message must use conventional commit format (e.g. feat: ..., fix: ...)",
  );
}

if (!ALLOWED_TYPES.has(commitType)) {
  fail(
    `unknown commit type "${commitType}" — allowed types: feat!, feat, fix, chore, refactor, test`,
  );
}

if (SKIP_TYPES.has(commitType)) {
  process.exit(0);
}

const packagesToBump = new Set();

for (const filePath of getStagedFiles()) {
  const packageName = packageNameFromPath(filePath);
  if (packageName && isRelevantPackageChange(packageName, filePath)) {
    packagesToBump.add(packageName);
  }
}

if (packagesToBump.size === 0) {
  process.exit(0);
}

let bumpedAny = false;

for (const packageName of packagesToBump) {
  const packageJsonPath = join(PACKAGES_DIR, packageName, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  if (!packageJson.version) {
    console.error(`packages/${packageName}/package.json is missing a version field`);
    process.exit(1);
  }

  const nextVersion = bumpVersion(packageJson.version, commitType);
  if (nextVersion === packageJson.version) {
    continue;
  }

  packageJson.version = nextVersion;
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  stagePackageJson(packageJsonPath);
  bumpedAny = true;
  console.log(
    `bump-package-versions: ${packageJson.name ?? packageName} → ${nextVersion} (${commitType})`,
  );
}

if (bumpedAny) {
  writeFileSync(VERSION_BUMP_PENDING_FLAG, "");
}
