/** Reading text scale for the Journal (LEO-21). "md" is the original size. */
export const FONT_SIZES = ["sm", "md", "lg"] as const;
export type FontSize = (typeof FONT_SIZES)[number];

export const FONT_SIZE_KEY = "jr-font-size";
export const FONT_SIZE_ATTR = "data-jr-size";

export function parseFontSize(value: string | null | undefined): FontSize {
  return value === "sm" || value === "lg" ? value : "md";
}

/**
 * Runs inline while <main class="jr-root"> is parsed, before the first paint.
 * The attribute lives on <html>, but only `.jr-root` rules read it.
 */
export const FONT_SIZE_SCRIPT = `try{var s=localStorage.getItem(${JSON.stringify(FONT_SIZE_KEY)}),d=document.documentElement;s==="sm"||s==="lg"?d.setAttribute(${JSON.stringify(FONT_SIZE_ATTR)},s):d.removeAttribute(${JSON.stringify(FONT_SIZE_ATTR)})}catch(e){}`;
