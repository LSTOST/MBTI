"use client";

import { useEffect, useRef, useState } from "react";

const loadingMessages = [
  "正在解析你们的星座能量...",
  "匹配 MBTI 性格特质...",
  "计算情感契合指数...",
  "生成专属分析报告...",
];

type StarConfig = {
  id: number;
  size: number;
  left: number;
  top: number;
  opacity: number;
  duration: number;
  delay: number;
  isPurple?: boolean;
};

// 预定义固定星星数据（避免 hydration mismatch）
const starsData: StarConfig[] = [
  { id: 0, size: 0.8, left: 5, top: 12, opacity: 0.15, duration: 5, delay: 0.2 },
  { id: 1, size: 1.0, left: 15, top: 8, opacity: 0.2, duration: 4.5, delay: 0.8 },
  { id: 2, size: 0.6, left: 25, top: 22, opacity: 0.12, duration: 5.5, delay: 1.2 },
  { id: 3, size: 0.9, left: 35, top: 5, opacity: 0.18, duration: 4.8, delay: 0.5 },
  { id: 4, size: 0.7, left: 45, top: 18, opacity: 0.14, duration: 5.2, delay: 1.5 },
  { id: 5, size: 1.1, left: 55, top: 10, opacity: 0.22, duration: 4.2, delay: 0.3 },
  { id: 6, size: 0.8, left: 65, top: 25, opacity: 0.16, duration: 5.8, delay: 2.0 },
  { id: 7, size: 0.6, left: 75, top: 15, opacity: 0.13, duration: 4.6, delay: 1.0 },
  { id: 8, size: 0.9, left: 85, top: 8, opacity: 0.19, duration: 5.0, delay: 0.7 },
  { id: 9, size: 0.7, left: 92, top: 20, opacity: 0.15, duration: 4.4, delay: 1.8 },
  { id: 10, size: 0.8, left: 8, top: 35, opacity: 0.17, duration: 5.3, delay: 0.4 },
  { id: 11, size: 1.0, left: 18, top: 42, opacity: 0.21, duration: 4.7, delay: 1.1 },
  { id: 12, size: 0.6, left: 28, top: 38, opacity: 0.11, duration: 5.6, delay: 2.2 },
  { id: 13, size: 0.9, left: 38, top: 45, opacity: 0.18, duration: 4.3, delay: 0.6 },
  { id: 14, size: 0.7, left: 48, top: 32, opacity: 0.14, duration: 5.1, delay: 1.4 },
  { id: 15, size: 1.2, left: 58, top: 48, opacity: 0.23, duration: 4.0, delay: 0.9 },
  { id: 16, size: 0.8, left: 68, top: 40, opacity: 0.16, duration: 5.4, delay: 1.7 },
  { id: 17, size: 0.6, left: 78, top: 35, opacity: 0.12, duration: 4.9, delay: 2.5 },
  { id: 18, size: 0.9, left: 88, top: 42, opacity: 0.19, duration: 5.2, delay: 0.3 },
  { id: 19, size: 0.7, left: 95, top: 38, opacity: 0.15, duration: 4.5, delay: 1.0 },
  { id: 20, size: 0.8, left: 12, top: 55, opacity: 0.17, duration: 5.0, delay: 0.8 },
  { id: 21, size: 1.0, left: 22, top: 62, opacity: 0.2, duration: 4.6, delay: 1.5 },
  { id: 22, size: 0.6, left: 32, top: 58, opacity: 0.13, duration: 5.7, delay: 2.1 },
  { id: 23, size: 0.9, left: 42, top: 65, opacity: 0.18, duration: 4.2, delay: 0.4 },
  { id: 24, size: 0.7, left: 52, top: 52, opacity: 0.14, duration: 5.3, delay: 1.2 },
  { id: 25, size: 1.1, left: 62, top: 68, opacity: 0.22, duration: 4.4, delay: 0.7 },
  { id: 26, size: 0.8, left: 72, top: 60, opacity: 0.16, duration: 5.5, delay: 1.9 },
  { id: 27, size: 0.6, left: 82, top: 55, opacity: 0.12, duration: 4.8, delay: 2.3 },
  { id: 28, size: 0.9, left: 90, top: 62, opacity: 0.19, duration: 5.1, delay: 0.5 },
  { id: 29, size: 0.7, left: 3, top: 72, opacity: 0.15, duration: 4.7, delay: 1.3 },
  { id: 30, size: 0.8, left: 10, top: 78, opacity: 0.17, duration: 5.2, delay: 0.6 },
  { id: 31, size: 1.0, left: 20, top: 85, opacity: 0.21, duration: 4.3, delay: 1.6 },
  { id: 32, size: 0.6, left: 30, top: 75, opacity: 0.11, duration: 5.8, delay: 2.4 },
  { id: 33, size: 0.9, left: 40, top: 82, opacity: 0.18, duration: 4.5, delay: 0.2 },
  { id: 34, size: 0.7, left: 50, top: 88, opacity: 0.14, duration: 5.4, delay: 1.1 },
  { id: 35, size: 1.2, left: 60, top: 75, opacity: 0.23, duration: 4.1, delay: 0.9 },
  { id: 36, size: 0.8, left: 70, top: 82, opacity: 0.16, duration: 5.6, delay: 1.8 },
  { id: 37, size: 0.6, left: 80, top: 78, opacity: 0.12, duration: 4.9, delay: 2.6 },
  { id: 38, size: 0.9, left: 88, top: 85, opacity: 0.19, duration: 5.0, delay: 0.4 },
  { id: 39, size: 0.7, left: 96, top: 72, opacity: 0.15, duration: 4.6, delay: 1.4 },
  { id: 40, size: 1.5, left: 8, top: 15, opacity: 0.35, duration: 3.5, delay: 0.3, isPurple: true },
  { id: 41, size: 1.8, left: 18, top: 28, opacity: 0.4, duration: 3.2, delay: 0.8 },
  { id: 42, size: 1.4, left: 28, top: 12, opacity: 0.32, duration: 3.8, delay: 1.5 },
  { id: 43, size: 1.6, left: 38, top: 35, opacity: 0.38, duration: 3.4, delay: 0.5, isPurple: true },
  { id: 44, size: 1.5, left: 48, top: 22, opacity: 0.35, duration: 3.6, delay: 1.2 },
  { id: 45, size: 1.9, left: 58, top: 18, opacity: 0.42, duration: 3.0, delay: 0.6 },
  { id: 46, size: 1.4, left: 68, top: 32, opacity: 0.33, duration: 3.9, delay: 1.8, isPurple: true },
  { id: 47, size: 1.7, left: 78, top: 25, opacity: 0.39, duration: 3.3, delay: 0.4 },
  { id: 48, size: 1.5, left: 88, top: 15, opacity: 0.36, duration: 3.7, delay: 1.0 },
  { id: 49, size: 1.6, left: 12, top: 45, opacity: 0.37, duration: 3.5, delay: 0.7, isPurple: true },
  { id: 50, size: 1.8, left: 22, top: 52, opacity: 0.41, duration: 3.1, delay: 1.4 },
  { id: 51, size: 1.4, left: 32, top: 48, opacity: 0.32, duration: 3.8, delay: 2.0 },
  { id: 52, size: 1.6, left: 42, top: 55, opacity: 0.38, duration: 3.4, delay: 0.3, isPurple: true },
  { id: 53, size: 1.5, left: 52, top: 42, opacity: 0.35, duration: 3.6, delay: 1.1 },
  { id: 54, size: 1.9, left: 62, top: 58, opacity: 0.43, duration: 3.0, delay: 0.9 },
  { id: 55, size: 1.4, left: 72, top: 50, opacity: 0.33, duration: 3.9, delay: 1.6, isPurple: true },
  { id: 56, size: 1.7, left: 82, top: 45, opacity: 0.39, duration: 3.2, delay: 0.5 },
  { id: 57, size: 1.5, left: 92, top: 52, opacity: 0.36, duration: 3.7, delay: 1.3 },
  { id: 58, size: 1.6, left: 15, top: 68, opacity: 0.37, duration: 3.5, delay: 0.8, isPurple: true },
  { id: 59, size: 1.8, left: 25, top: 75, opacity: 0.41, duration: 3.1, delay: 1.7 },
  { id: 60, size: 1.4, left: 35, top: 72, opacity: 0.32, duration: 3.8, delay: 2.2 },
  { id: 61, size: 1.6, left: 45, top: 78, opacity: 0.38, duration: 3.4, delay: 0.4, isPurple: true },
  { id: 62, size: 1.5, left: 55, top: 65, opacity: 0.35, duration: 3.6, delay: 1.0 },
  { id: 63, size: 1.9, left: 65, top: 82, opacity: 0.43, duration: 3.0, delay: 0.6 },
  { id: 64, size: 1.4, left: 75, top: 70, opacity: 0.33, duration: 3.9, delay: 1.5, isPurple: true },
  { id: 65, size: 1.7, left: 85, top: 75, opacity: 0.39, duration: 3.2, delay: 0.2 },
  { id: 66, size: 1.5, left: 95, top: 68, opacity: 0.36, duration: 3.7, delay: 1.2 },
  { id: 67, size: 1.6, left: 5, top: 88, opacity: 0.37, duration: 3.5, delay: 0.9, isPurple: true },
  { id: 68, size: 1.8, left: 50, top: 92, opacity: 0.41, duration: 3.1, delay: 1.8 },
  { id: 69, size: 1.4, left: 80, top: 90, opacity: 0.32, duration: 3.8, delay: 2.5 },
  { id: 70, size: 2.5, left: 10, top: 20, opacity: 0.6, duration: 2.5, delay: 0.2 },
  { id: 71, size: 2.8, left: 25, top: 35, opacity: 0.7, duration: 2.2, delay: 0.8 },
  { id: 72, size: 2.4, left: 40, top: 15, opacity: 0.55, duration: 2.6, delay: 1.3 },
  { id: 73, size: 2.6, left: 55, top: 40, opacity: 0.65, duration: 2.4, delay: 0.5 },
  { id: 74, size: 2.5, left: 70, top: 25, opacity: 0.6, duration: 2.5, delay: 1.0 },
  { id: 75, size: 2.9, left: 85, top: 35, opacity: 0.72, duration: 2.1, delay: 0.6 },
  { id: 76, size: 2.4, left: 15, top: 60, opacity: 0.55, duration: 2.6, delay: 1.5 },
  { id: 77, size: 2.6, left: 45, top: 70, opacity: 0.65, duration: 2.4, delay: 0.3 },
  { id: 78, size: 2.5, left: 75, top: 55, opacity: 0.6, duration: 2.5, delay: 1.1 },
  { id: 79, size: 2.8, left: 90, top: 75, opacity: 0.7, duration: 2.2, delay: 0.7 },
];

const meteorsData = [
  { id: 0, delay: 0.5, duration: 1.8, top: 15, left: 25 },
  { id: 1, delay: 3.2, duration: 2.0, top: 35, left: 55 },
  { id: 2, delay: 6.8, duration: 1.6, top: 22, left: 70 },
];

const particleSlots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export default function CalculatingPage() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const messageTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIsVisible(false);
      if (messageTimeoutRef.current !== null) {
        window.clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = window.setTimeout(() => {
        messageTimeoutRef.current = null;
        setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
        setIsVisible(true);
      }, 400);
    }, 2800);

    return () => {
      window.clearInterval(interval);
      if (messageTimeoutRef.current !== null) {
        window.clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  return (
    <main className="relative mx-auto flex min-h-svh w-full max-w-[428px] items-center justify-center overflow-hidden bg-[#0A0A0F]">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 100% at 50% 100%, rgba(124, 92, 252, 0.05) 0%, transparent 50%),
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(30, 20, 60, 0.8) 0%, transparent 50%),
            #0A0A0F
          `,
        }}
      />

      <div className="absolute inset-0">
        {starsData.slice(0, 40).map((star) => (
          <div
            key={`far-${star.id}`}
            className="absolute rounded-full bg-white/60"
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              left: `${star.left}%`,
              top: `${star.top}%`,
              opacity: star.opacity,
              animation: `calculating-twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}

        {starsData.slice(40, 70).map((star) => (
          <div
            key={`mid-${star.id}`}
            className="absolute rounded-full"
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              left: `${star.left}%`,
              top: `${star.top}%`,
              opacity: star.opacity,
              background: star.isPurple ? "rgba(124, 92, 252, 0.8)" : "rgba(255, 255, 255, 0.8)",
              boxShadow: star.isPurple
                ? "0 0 4px rgba(124, 92, 252, 0.5)"
                : "0 0 2px rgba(255, 255, 255, 0.3)",
              animation: `calculating-twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}

        {starsData.slice(70, 80).map((star) => (
          <div
            key={`near-${star.id}`}
            className="absolute rounded-full bg-white"
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              left: `${star.left}%`,
              top: `${star.top}%`,
              boxShadow: "0 0 6px rgba(255, 255, 255, 0.6), 0 0 12px rgba(124, 92, 252, 0.3)",
              animation: `calculating-twinkle-bright ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 overflow-hidden">
        {meteorsData.map((meteor) => (
          <div
            key={meteor.id}
            className="absolute h-px w-[100px]"
            style={{
              top: `${meteor.top}%`,
              left: `${meteor.left}%`,
              background: "linear-gradient(90deg, rgba(124, 92, 252, 0.8), rgba(124, 92, 252, 0) 100%)",
              transform: "rotate(-45deg)",
              animation: `calculating-meteor ${meteor.duration}s ease-out infinite`,
              animationDelay: `${meteor.delay}s`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0">
        {particleSlots.map((i) => (
          <div
            key={`particle-${i}`}
            className="absolute h-1 w-1 rounded-full bg-[#7C5CFC]"
            style={{
              left: `${15 + (i % 4) * 25}%`,
              top: `${20 + Math.floor(i / 4) * 30}%`,
              opacity: 0.2 + (i % 3) * 0.1,
              animation: `calculating-float ${6 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 150% 80% at 50% 50%, rgba(124, 92, 252, 0.15) 0%, transparent 40%),
            radial-gradient(ellipse 100% 50% at 20% 80%, rgba(124, 92, 252, 0.1) 0%, transparent 35%),
            radial-gradient(ellipse 80% 40% at 80% 20%, rgba(147, 112, 255, 0.08) 0%, transparent 30%)
          `,
          animation: "calculating-nebula-pulse 8s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-8">
        <div className="relative mb-12 h-28 w-28">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: "1px solid rgba(124, 92, 252, 0.2)",
              animation: "calculating-spin 12s linear infinite",
            }}
          >
            <div
              className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#7C5CFC]"
              style={{ boxShadow: "0 0 8px rgba(124, 92, 252, 0.6)" }}
            />
          </div>

          <div
            className="absolute inset-3 rounded-full"
            style={{
              border: "1px solid rgba(124, 92, 252, 0.25)",
              animation: "calculating-spin-reverse 8s linear infinite",
            }}
          >
            <div
              className="absolute right-[-4px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#7C5CFC]/80"
              style={{ boxShadow: "0 0 6px rgba(124, 92, 252, 0.5)" }}
            />
          </div>

          <div
            className="absolute inset-6 rounded-full"
            style={{
              border: "1px solid rgba(124, 92, 252, 0.3)",
              animation: "calculating-spin 5s linear infinite",
            }}
          >
            <div className="absolute bottom-[-2px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#7C5CFC]" />
          </div>

          <div
            className="absolute inset-9 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(124, 92, 252, 0.6) 0%, rgba(124, 92, 252, 0.2) 50%, transparent 70%)",
              animation: "calculating-core-pulse 3s ease-in-out infinite",
            }}
          />

          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="h-3 w-3 rounded-full bg-[#7C5CFC]"
              style={{
                boxShadow: "0 0 20px rgba(124, 92, 252, 0.8), 0 0 40px rgba(124, 92, 252, 0.4)",
                animation: "calculating-center-glow 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        <p
          className={`text-center text-[15px] font-normal leading-[1.6] text-[#8E8E93] transition-opacity ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDuration: "400ms" }}
        >
          {loadingMessages[messageIndex]}
        </p>
      </div>

      <div className="absolute bottom-12 left-0 right-0 px-16">
        <div className="relative h-[2px] overflow-hidden rounded-full bg-[#1A1A24]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[#7C5CFC] transition-all duration-500 ease-out"
            style={{
              width: `${((messageIndex + 1) / loadingMessages.length) * 100}%`,
              boxShadow: "0 0 8px rgba(124, 92, 252, 0.6)",
            }}
          />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
              animation: "calculating-shimmer 2s ease-in-out infinite",
            }}
          />
        </div>
        <p className="mt-3 text-center text-[11px] tracking-wider text-[#48484A]">
          {messageIndex + 1} / {loadingMessages.length}
        </p>
      </div>
    </main>
  );
}
