import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

/**
 * 1200x630 social card.
 *
 * Carries a call to action and a real sample of the product (segmented token
 * chips) rather than a bare logo and title. A card that only repeats the page
 * title wastes the one slot you get in a feed.
 */

export const alt =
  "Token Counter: count tokens for GPT-5, Claude, Gemini and Llama in your browser, with token boundaries shown as highlighted chips";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#211d16";
const INK = "#f2ede2";
const BRASS = "#e0a83a";
const MUTED = "#a29684";

/** A real segmentation of the sentence below, from o200k_base. */
const CHIPS = ["Token", "izers", " split", " on", " bytes", ",", " not", " characters"];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: BG,
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="44" height="44" viewBox="0 0 256 256">
            <g stroke={BRASS} strokeWidth="20" strokeLinecap="round" fill="none">
              <path d="M56 56 V200" />
              <path d="M200 56 V200" />
              <path d="M56 128 H200" />
              <path d="M92 104 L64 128 L92 152" />
              <path d="M164 104 L192 128 L164 152" />
            </g>
          </svg>
          <span style={{ fontSize: 30, letterSpacing: 1, color: MUTED }}>
            {SITE_NAME}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              maxWidth: 940,
            }}
          >
            Count tokens for GPT-5, Claude, Gemini and Llama
          </div>

          {/* A real token stream, so the card shows the product working. */}
          <div style={{ display: "flex", gap: 6, marginTop: 34, flexWrap: "wrap" }}>
            {CHIPS.map((chip, i) => (
              <div
                key={chip}
                style={{
                  display: "flex",
                  padding: "8px 12px",
                  borderRadius: 4,
                  border: "1px solid #4a4232",
                  background: i % 2 === 0 ? "#2c2719" : "#332b1d",
                  fontSize: 26,
                  fontFamily: "monospace",
                  color: INK,
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: BRASS,
              color: BG,
              fontSize: 27,
              fontWeight: 600,
              padding: "16px 32px",
              borderRadius: 6,
            }}
          >
            Count your text
            <span style={{ fontSize: 29 }}>&rarr;</span>
          </div>
          <div style={{ fontSize: 24, color: MUTED, maxWidth: 620 }}>
            Runs in your browser. Nothing you paste is ever sent to a server.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
