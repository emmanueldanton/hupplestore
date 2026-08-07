import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite résout nativement les alias de tsconfig (« @/… ») : aucun plugin requis.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
