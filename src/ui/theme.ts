// The System's look: holographic blue panels on a deep navy void, one deliberate
// dark theme on both platforms.

export const color = {
  void: "#060a13",
  void2: "#0b1322",
  panel: "rgba(10, 20, 38, 0.92)",
  inset: "rgba(6, 10, 19, 0.6)",
  line: "rgba(58, 141, 255, 0.55)",
  glow: "#5cc8ff",
  text: "#dce8ff",
  dim: "#8195b8",
  faint: "#26344f",
  danger: "#ff4157",
  ok: "#4be3a4",
  body: "#ff7b5c",
  mind: "#a993ff",
  wealth: "#f3c454",
} as const;

export const areaColor = { body: color.body, mind: color.mind, wealth: color.wealth } as const;

export const rankColor = { E: "#9aa7bd", D: "#7fd1a8", C: "#5cc8ff", B: "#a993ff", A: "#ffb15c", S: "#ff4f6d" } as const;

export const font = {
  display: "SairaCondensed_600SemiBold",
  displayBold: "SairaCondensed_700Bold",
  body: "Barlow_400Regular",
  bodyMedium: "Barlow_500Medium",
  bodySemi: "Barlow_600SemiBold",
  mono: "JetBrainsMono_400Regular",
  monoBold: "JetBrainsMono_600SemiBold",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;
