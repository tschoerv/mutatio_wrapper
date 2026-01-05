import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  ...nextCoreWebVitals,

  // Your ignores / overrides go here
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];
