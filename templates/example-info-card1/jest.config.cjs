/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: [
    // Import @pcms/mini-app-react-test-utils in tests for jest-dom and cdnBridge cleanup.
  ],
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          isolatedModules: true,
        },
      },
    ],
  },
  clearMocks: true,
};
