import Image from "next/image";
import type { Root } from "hast";
import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

/**
 * Renders a validated story tree. The tree comes from Markdown without raw
 * HTML (the validator rejects it and remark-rehype drops it), so only the
 * elements Markdown itself produces can appear here.
 */
export default function StoryBody({ tree, sizes }: { tree: Root; sizes: string }) {
  const components: Partial<Components> = {
    img: ({ src, alt, width, height }) => (
      <Image
        src={String(src)}
        alt={String(alt ?? "")}
        width={Number(width)}
        height={Number(height)}
        sizes={sizes}
        className="jr-figure__img"
      />
    ),
    figure: ({ children }) => <figure className="jr-figure jr-figure--inline">{children}</figure>,
    a: ({ href, children }) => (
      <a href={href} rel="noopener">
        {children}
      </a>
    ),
  };
  return toJsxRuntime(tree, { Fragment, jsx, jsxs, components });
}
