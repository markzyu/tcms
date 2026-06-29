#!/usr/bin/env tsx
import { execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

import { createManifests } from "../createManifests";
import { createTemplatePack } from "../createTemplatePack";
import { loadTemplateBuildConfig } from "../loadConfigModule";

const CARD_SCHEMA_SOURCE = `export const schemaVersion = "0.1.0";

export const contentSchema = {
  safeParse(value) {
    if (typeof value === "object" && value !== null && "name" in value) {
      return { success: true, data: value };
    }
    return { success: false, error: { issues: [] } };
  },
};

export const editorUiSchema = {
  fieldGroups: [
    {
      name: "Basic Information",
      paths: ["name", "headline"],
      isSingleton: true,
    },
  ],
};

export const templateManifest = {
  id: "contact-card",
  version: "1.0.0",
  title: "Contact Card",
  pages: {
    main: {
      schema: "content.schema.json",
    },
  },
};
`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function createTempDir(label: string): string {
  return mkdtempSync(join(tmpdir(), `pcms-mini-app-build-utils-${label}-`));
}

function removeTempDir(tempDir: string): void {
  rmSync(tempDir, { recursive: true, force: true });
}

async function testManifestOutputs(): Promise<void> {
  const tempDir = createTempDir("manifests");
  const configPath = join(tempDir, "cardContent.ts");
  const outputDir = join(tempDir, "dist");

  try {
    writeFileSync(configPath, CARD_SCHEMA_SOURCE, "utf8");

    const config = await loadTemplateBuildConfig(configPath);
    assert(config.schemaVersion === "0.1.0", "loaded schemaVersion should match cardContent.ts");
    assert(config.templateManifest.id === "contact-card", "loaded template id should match");

    const contentSchema = z.object({
      name: z.string(),
      headline: z.string(),
      heroAltText: z.string().optional(),
    });

    createManifests({
      outputDir,
      schemaVersion: config.schemaVersion,
      contentSchema,
      editorUiSchema: config.editorUiSchema,
      templateManifest: config.templateManifest,
    });

    const contentSchemaDocument = JSON.parse(
      readFileSync(join(outputDir, "content.schema.json"), "utf8"),
    ) as {
      schemaVersion: string;
      editorUiSchema: { fieldGroups: Array<{ paths: string[] }> };
      jsonSchema: { required?: string[]; properties?: Record<string, unknown> };
    };
    const templateManifest = JSON.parse(
      readFileSync(join(outputDir, "template.manifest.json"), "utf8"),
    ) as { id: string; pages: { main: { schema: string } } };

    assert(
      contentSchemaDocument.schemaVersion === "0.1.0",
      "content.schema.json schemaVersion should match",
    );
    assert(
      contentSchemaDocument.editorUiSchema.fieldGroups[0]?.paths.includes("name"),
      "content.schema.json should include editor UI groups from config",
    );
    assert(
      contentSchemaDocument.jsonSchema.required?.includes("name"),
      "jsonSchema required should include name",
    );
    assert(
      !contentSchemaDocument.jsonSchema.required?.includes("heroAltText"),
      "jsonSchema required should omit optional heroAltText",
    );
    assert(
      contentSchemaDocument.jsonSchema.properties?.heroAltText !== undefined,
      "jsonSchema properties should include optional heroAltText",
    );
    assert(templateManifest.id === "contact-card", "template.manifest.json id should match");
    assert(
      templateManifest.pages.main.schema === "content.schema.json",
      "template.manifest.json should reference content.schema.json",
    );
  } finally {
    removeTempDir(tempDir);
  }
}

async function testPackFormat(): Promise<void> {
  const tempDir = createTempDir("pack");
  const distDir = join(tempDir, "dist");
  const zipPath = join(tempDir, "contact-card-template.zip");

  try {
    mkdirSync(distDir, { recursive: true });
    writeFileSync(join(distDir, "template.manifest.json"), '{"id":"contact-card"}\n', "utf8");
    writeFileSync(join(distDir, "content.schema.json"), "{}\n", "utf8");
    writeFileSync(join(distDir, "app.js"), "", "utf8");
    writeFileSync(join(distDir, "app.css"), "", "utf8");

    await createTemplatePack({ distDir, outputZipPath: zipPath });

    const listing = execSync(`unzip -l "${zipPath}"`, { encoding: "utf8" });
    const expectedPaths = [
      "templates/contact-card/manifest.json",
      "templates/contact-card/schema/content.schema.json",
      "templates/contact-card/app/app.js",
      "templates/contact-card/app/app.css",
    ];

    for (const expectedPath of expectedPaths) {
      assert(listing.includes(expectedPath), `zip should contain ${expectedPath}`);
    }

    assert(
      !listing.includes("templates/contact-card/app/template.manifest.json"),
      "zip should not place manifest.json under app/",
    );
  } finally {
    removeTempDir(tempDir);
  }
}

async function main(): Promise<void> {
  const tests = [
    ["manifest outputs", testManifestOutputs],
    ["pack format", testPackFormat],
  ] as const;

  for (const [name, runTest] of tests) {
    await runTest();
    console.log(`ok - ${name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
