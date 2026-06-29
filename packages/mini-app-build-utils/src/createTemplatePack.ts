import { createWriteStream } from "node:fs";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import archiver from "archiver";

const MANIFEST_FILE = "template.manifest.json";
const CONTENT_SCHEMA_FILE = "content.schema.json";

export type CreateTemplatePackOptions = {
  distDir: string;
  outputZipPath: string;
  templateId?: string;
};

function readTemplateId(distDir: string, templateId?: string): string {
  if (templateId) {
    return templateId;
  }

  const manifest = JSON.parse(
    readFileSync(join(distDir, MANIFEST_FILE), "utf8"),
  ) as { id?: string };

  if (!manifest.id) {
    throw new Error(`${MANIFEST_FILE} in ${distDir} is missing "id"`);
  }

  return manifest.id;
}

function listAppArtifacts(distDir: string): string[] {
  return readdirSync(distDir).filter((fileName) => {
    if (fileName.endsWith(".zip")) {
      return false;
    }
    return fileName !== MANIFEST_FILE && fileName !== CONTENT_SCHEMA_FILE;
  });
}

export async function createTemplatePack(
  options: CreateTemplatePackOptions,
): Promise<void> {
  const { distDir, outputZipPath } = options;
  const templateId = readTemplateId(distDir, options.templateId);
  const packRoot = `templates/${templateId}`;

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(outputZipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", (error) => reject(error));

    archive.pipe(output);

    archive.file(join(distDir, MANIFEST_FILE), {
      name: `${packRoot}/manifest.json`,
    });

    archive.file(join(distDir, CONTENT_SCHEMA_FILE), {
      name: `${packRoot}/schema/content.schema.json`,
    });

    for (const fileName of listAppArtifacts(distDir)) {
      archive.file(join(distDir, fileName), {
        name: `${packRoot}/app/${fileName}`,
      });
    }

    archive.finalize();
  });
}
