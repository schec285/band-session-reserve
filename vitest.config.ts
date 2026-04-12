import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: true,
    clearMocks: true,
    include: [
      "src/tests/api/**/*.test.ts",
      "src/tests/services/**/*.test.ts",
      "src/tests/lib/**/*.test.ts",
    ],
  },
});
