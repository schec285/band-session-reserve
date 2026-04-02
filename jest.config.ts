import type { Config } from "jest";

const config: Config = {
  projects: [
    {
      displayName: "API",
      testEnvironment: "node",
      testMatch: [
        "<rootDir>/src/tests/api/**/*.test.ts",
        "<rootDir>/src/lib/**/test/*.test.ts",
      ],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "commonjs" } }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
    },
    {
      displayName: "UI",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/src/components/**/test/*.test.tsx"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "commonjs" } }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    },
  ],
};

export default config;
