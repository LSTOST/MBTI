"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const easeOut = [0.22, 1, 0.36, 1] as const;

type Props = {
  mbti: string;
  zodiac: string | null | undefined;
  /** 与整页 Wave 2 对齐（秒） */
  delay?: number;
};

export function SoulmateReveal({ mbti, zodiac, delay = 0.12 }: Props) {
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setReady(true));
  }, []);

  const sign = zodiac ?? "";

  if (reduceMotion) {
    return (
      <div className="mt-8 flex flex-col items-center text-center">
        <p className="text-[13px] font-medium tracking-[0.18em] text-[#8E8E93]">你的灵魂伴侣是</p>
        <h1
          className="mt-4 font-display text-[76px] font-bold leading-[0.95] tracking-[0.06em] text-[#F5F5F7]"
          style={{ textShadow: "0 0 64px rgba(124,92,252,0.55), 0 0 120px rgba(124,92,252,0.2)" }}
        >
          {mbti}
        </h1>
        <p className="mt-3 text-[22px] font-semibold leading-tight text-[#F5F5F7]">{sign}</p>
      </div>
    );
  }

  return (
    <motion.div
      className="mt-8 flex flex-col items-center text-center"
      initial="hidden"
      animate={ready ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { delay, staggerChildren: 0.16, delayChildren: 0 },
        },
      }}
    >
      <motion.p
        className="text-[13px] font-medium tracking-[0.18em] text-[#8E8E93]"
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
        }}
      >
        你的灵魂伴侣是
      </motion.p>

      <motion.div
        className="relative mt-4 flex w-full max-w-[380px] flex-col items-center"
        variants={{
          hidden: { opacity: 0, y: 24, scale: 0.92, filter: "blur(10px)" },
          visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            transition: { duration: 0.68, ease: easeOut },
          },
        }}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[42%] z-0 h-[100px] w-[min(92vw,320px)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[#7C5CFC]"
          style={{ filter: "blur(44px)" }}
          initial={{ opacity: 0.2 }}
          animate={{
            opacity: [0.16, 0.42, 0.16],
            scale: [0.93, 1.05, 0.93],
          }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <h1
          className="relative z-10 font-display text-[76px] font-bold leading-[0.95] tracking-[0.06em] text-[#F5F5F7]"
          style={{ textShadow: "0 0 64px rgba(124,92,252,0.55), 0 0 120px rgba(124,92,252,0.2)" }}
        >
          {mbti}
        </h1>
      </motion.div>

      <motion.p
        className="relative z-10 mt-3 text-[22px] font-semibold leading-tight text-[#F5F5F7]"
        variants={{
          hidden: { opacity: 0, y: 14 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: easeOut } },
        }}
      >
        {sign}
      </motion.p>
    </motion.div>
  );
}
