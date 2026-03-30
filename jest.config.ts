import type { Config } from "jest";

const config: Config = {
  projects: [
    {
      displayName: "API",
      testEnvironment: "node",
      testMatch: ["<rootDir>/app/api/**/*.test.ts"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "commonjs" } }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
      },
    },
    {
      displayName: "UI",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/components/**/*.test.tsx"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "commonjs" } }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
      },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    },
  ],
};

export default config;
