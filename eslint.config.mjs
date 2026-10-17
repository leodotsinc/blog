import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals.map((config) =>
    config.name === "next"
      ? {
          ...config,
          // The pinned brace-expansion 5 API is incompatible with ESLint's
          // minimatch 3. Separate globs preserve Next's file coverage without braces.
          files: ["js", "jsx", "mjs", "ts", "tsx", "mts", "cts"].map(
            (extension) => `**/*.${extension}`,
          ),
        }
      : config,
  ),
  ...nextTypescript,
  { ignores: [".contentlayer/**", "coverage/**"] },
];

export default eslintConfig;
