/**
 * 后台 UI 设计 token。集中在此，便于跨组件保持一致。
 * 颜色值沿用 redeem-codes-console 里已经打磨过的暗色面板调性。
 */
export const adminTokens = {
  bg: {
    page: "#0A0A0F",
    panel: "#111118",
    subtle: "#1A1A24",
    input: "#0A0A0F",
    hover: "#1A1A24",
  },
  text: {
    primary: "#F5F5F7",
    secondary: "#8E8E93",
    tertiary: "#48484A",
    bright: "#E8E8ED",
  },
  border: {
    base: "#1A1A24",
    strong: "#2A2A36",
  },
  accent: {
    base: "#7C5CFC",
    soft: "rgba(124,92,252,0.12)",
    softer: "rgba(124,92,252,0.08)",
    text: "#C4B5FC",
    ring: "rgba(124,92,252,0.2)",
  },
  status: {
    success: "#34C759",
    successSoft: "rgba(52,199,89,0.12)",
    warning: "#FF9F0A",
    warningSoft: "rgba(255,159,10,0.14)",
    danger: "#FF453A",
    dangerSoft: "rgba(255,69,58,0.12)",
  },
} as const;
