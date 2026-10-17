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
  {
    files: ["components/home/HeroCanvas.tsx"],
    // R3F exposes mutable Three.js objects; effects and useFrame intentionally
    // update scene.environment and shared shader uniforms without React renders.
    rules: { "react-hooks/immutability": "off" },
  },
  {
    files: [
      "components/home/CustomCursor.tsx",
      "components/nav/MenuOverlay.tsx",
      "components/resume/TableOfContents.tsx",
    ],
    // Browser capabilities, the live clock and committed DOM headings are read
    // after mount; keep their server render and first client render identical.
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    files: ["components/nav/SiteHeader.tsx", "components/nav/CommandPalette.tsx"],
    // Preserve the existing route/open/query resets and overlay focus lifecycle.
    // Refactoring those interactions belongs in a separately validated UI change.
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    files: ["components/mdx/MDXContent.tsx", "components/resume/MDXContent.tsx"],
    // Contentlayer's useMDXComponent creates a component from compiled MDX at
    // runtime; keep this library integration outside the static-components check.
    rules: { "react-hooks/static-components": "off" },
  },
];

export default eslintConfig;
