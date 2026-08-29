import { cleanUpSchemaDirectory, defineRootManifest } from "@tcms/mini-app-common";
await cleanUpSchemaDirectory();

// Do not import any schema until cleanup is done.
const { gameConfigSchemaName, gameConfigSchemaPathPromise } = await import("./gameConfig");
defineRootManifest({
  id: "game-dropnclick",
  title: {
    en: "[Example] Game Drop'n Click",
    ja: "[例] 物拾いゲーム",
  },
  version: "1.0.0",
  pages: {
    [gameConfigSchemaName]: {
      schema: await gameConfigSchemaPathPromise,
    },
  },
});