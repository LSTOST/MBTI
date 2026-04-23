"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  /**
   * IntersectionObserver 触发阈值。
   * "some" = 任意可见即触发；数值 0-1 = 元素的该比例可见才触发。
   * 注意：数值阈值对「比视口高的大模块」会永远达不到，导致内容停留在 opacity:0。
   * 此处默认 "some"，长模块（如 MBTI/星座深度解读）才能在滚入首屏时正常显露。
   */
  amount?: number | "some" | "all";
};

export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  amount = "some",
}: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

type ScaleInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /**
   * 为 true 时在水合完成后再从隐藏态播放到可见，避免 SSR 首帧已是终态导致看不出分波进场。
   */
  playAfterMount?: boolean;
};

const easeOut = [0.22, 1, 0.36, 1] as const;

export function ScaleIn({ children, className, delay = 0, playAfterMount = false }: ScaleInProps) {
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!playAfterMount) return;
    queueMicrotask(() => setReady(true));
  }, [playAfterMount]);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  if (playAfterMount) {
    return (
      <motion.div
        className={className}
        initial={false}
        animate={ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
        transition={
          ready
            ? { duration: 0.55, ease: easeOut, delay }
            : { duration: 0 }
        }
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: easeOut, delay }}
    >
      {children}
    </motion.div>
  );
}
