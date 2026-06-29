/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/test-utils/setup.ts"],
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
