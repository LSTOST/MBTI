"use client";

import dynamic from "next/dynamic";

import { HeroAurora } from "@/components/hero-aurora";

const GalaxyScene = dynamic(
  () => import("./galaxy-scene").then((mod) => mod.GalaxyScene),
  { ssr: false }
);

function ConstellationOverlay() {
  return (
    <div className="pointer-events-none absolute left-9 top-15 z-10">
      <svg
        viewBox="0 0 125 98"
        className="h-[49px] w-[63px]"
        style={{ filter: "drop-shadow(0 0 4px rgba(180,200,255,0.3))" }}
      >
        {/* 北斗七星 — 勺柄: 摇光→开阳→玉衡  勺斗: 天权→天璇→天枢→天玑 */}
        <circle cx="8"   cy="16" r="2.0" fill="#F5F5F7" className="constellation-star-bright" />
        <circle cx="38"  cy="12" r="1.6" fill="#F5F5F7" className="constellation-star" />
        <circle cx="58"  cy="36" r="2.2" fill="#F5F5F7" className="constellation-star-bright" />
        <circle cx="70"  cy="56" r="1.4" fill="#F5F5F7" className="constellation-star" />
        <circle cx="108" cy="50" r="2.0" fill="#F5F5F7" className="constellation-star-bright" />
        <circle cx="112" cy="78" r="1.7" fill="#F5F5F7" className="constellation-star" />
        <circle cx="74"  cy="84" r="1.5" fill="#F5F5F7" className="constellation-star" />

        {/* 勺柄 */}
        <line x1="8"  y1="16" x2="38"  y2="12" stroke="#F5F5F7" strokeWidth="0.6" opacity="0.3" />
        <line x1="38" y1="12" x2="58"  y2="36" stroke="#F5F5F7" strokeWidth="0.6" opacity="0.3" />
        <line x1="58" y1="36" x2="70"  y2="56" stroke="#F5F5F7" strokeWidth="0.6" opacity="0.3" />
        {/* 勺斗 */}
        <line x1="70"  y1="56" x2="108" y2="50" stroke="#F5F5F7" strokeWidth="0.6" opacity="0.3" />
        <line x1="108" y1="50" x2="112" y2="78" stroke="#F5F5F7" strokeWidth="0.6" opacity="0.3" />
        <line x1="112" y1="78" x2="74"  y2="84" stroke="#F5F5F7" strokeWidth="0.6" opacity="0.3" />
        <line x1="74"  y1="84" x2="70"  y2="56" stroke="#F5F5F7" strokeWidth="0.6" opacity="0.3" />
      </svg>
    </div>
  );
}

export function HeroVisual() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 100% at 50% 100%, rgba(124, 92, 252, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(30, 20, 60, 0.6) 0%, transparent 50%),
            #0A0A0F
          `,
        }}
      />

      <GalaxyScene />

      <div className="pointer-events-none absolute inset-0 z-[1]">
        <HeroAurora />
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[2] opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 50%, rgba(124, 92, 252, 0.15) 0%, transparent 50%)
          `,
        }}
      />

      {/* 底部渐变融合：让星空自然淡入背景色 */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[40%]"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, #0A0A0F 100%)",
        }}
      />

      <ConstellationOverlay />
    </div>
  );
}
