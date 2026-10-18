import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

// Rendered at build time only (the routes are fully static). TTFs are kept
// next to their OFL licenses; next/font ships woff2, which satori cannot read.
const fontDir = path.join(process.cwd(), "app/journal/_og/fonts");
const font = (file: string) => readFileSync(path.join(fontDir, file));

const PAPER = "#f3f3f3";
const INK = "#111111";
const GREY = "#555555";

export const OG_SIZE = { width: 1200, height: 630 };

export function journalOg({
  strip,
  headline,
  secondary = [],
  footer,
}: {
  strip: string[];
  headline?: string;
  secondary?: string[];
  footer?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          color: INK,
          padding: "44px 64px 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "Playfair",
            fontSize: 20,
            letterSpacing: 3,
            textTransform: "uppercase",
            borderBottom: `1px solid ${INK}`,
            paddingBottom: 12,
          }}
        >
          {strip.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            fontFamily: "Unifraktur",
            fontSize: headline ? 118 : 168,
            lineHeight: 1,
            marginTop: headline ? 20 : 92,
          }}
        >
          Leo’s Journal
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 18 }}>
          <div style={{ height: 5, background: INK }} />
          <div style={{ height: 1, background: INK, marginTop: 4 }} />
        </div>
        {headline ? (
          <div style={{ display: "flex", marginTop: 30, flex: 1 }}>
            <div
              style={{
                display: "flex",
                flex: 1.7,
                fontFamily: "Playfair",
                fontSize: 50,
                lineHeight: 1.08,
                paddingRight: 34,
              }}
            >
              {headline}
            </div>
            {secondary.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  borderLeft: `1px solid ${INK}`,
                  paddingLeft: 30,
                }}
              >
                {secondary.map((title, index) => (
                  <div
                    key={title}
                    style={{
                      display: "flex",
                      fontFamily: "Playfair",
                      fontSize: 25,
                      lineHeight: 1.18,
                      paddingBottom: 16,
                      marginBottom: 16,
                      borderBottom: index < secondary.length - 1 ? `1px solid ${GREY}` : "none",
                    }}
                  >
                    {title}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flex: 1 }} />
        )}
        {footer && (
          <div style={{ display: "flex", fontFamily: "Newsreader", fontStyle: "italic", fontSize: 26, color: GREY }}>
            {footer}
          </div>
        )}
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Unifraktur", data: font("UnifrakturMaguntia-Regular.ttf"), weight: 400, style: "normal" },
        { name: "Playfair", data: font("PlayfairDisplay-ExtraBold.ttf"), weight: 800, style: "normal" },
        { name: "Newsreader", data: font("Newsreader-Italic-latin.ttf"), weight: 400, style: "italic" },
      ],
    },
  );
}
