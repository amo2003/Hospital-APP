export type ThemeMode = "light" | "dark";
export const palettes = {
  light: { background: "#f2f9ff", surface: "#ffffff", text: "#102e57", muted: "#64748b", border: "#cfe2f7", accent: "#086ab9", canvas: "#e1ecf5" },
  dark: { background: "#0b1423", surface: "#17263c", text: "#e6eef9", muted: "#a7bad1", border: "#354b66", accent: "#79c4ff", canvas: "#080e19" },
};

// Adapt the existing CarePlus colour vocabulary by its role. Layout, images,
// brand-blue buttons/headers and translucent overlays retain their appearance.
export function themeColor(value: unknown, role: "background" | "text" | "border", mode: ThemeMode): any {
  if (mode === "light" || typeof value !== "string") return value;
  let hex = ({ white: "#ffffff", black: "#000000" } as Record<string, string>)[value.toLowerCase()] || value;
  if (!/^#([a-f\d]{3}|[a-f\d]{6})$/i.test(hex)) return value;
  hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const lightness = (max + min) / 510;
  if (role === "background") {
    if (lightness < 0.68) return value;
    if (max - min < 18) return lightness > 0.98 ? palettes.dark.surface : "#132135";
    if (r > g + 12 && r > b + 12) return "#3d222e";
    if (g > r + 8 && g > b) return "#17392f";
    if (r > b + 25 && g > b + 15) return "#3c3020";
    return "#16304a";
  }
  if (role === "border") return lightness > 0.65 ? palettes.dark.border : value;
  if (lightness > 0.72) return value; // White text on brand headers/buttons.
  if (max - min < 38) return lightness < 0.32 ? palettes.dark.text : palettes.dark.muted;
  if (b >= r && b >= g) return lightness < 0.26 ? palettes.dark.text : palettes.dark.accent;
  // Keep success/error/warning hues while lifting their contrast on dark cards.
  return `rgb(${[r, g, b].map((v) => Math.round(v + (255 - v) * 0.48)).join(", ")})`;
}
