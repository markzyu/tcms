/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: [
    // Import @tcms/mini-app-react-test-utils in tests for jest-dom and cdnBridge cleanup.
  ],
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
  transform: {
    "^.+\\.(ts|tsx|js|mjs)?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          module: "commonjs",
          isolatedModules: true,
        },
      },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!any-esm-package/)"],
  clearMocks: true,
};
