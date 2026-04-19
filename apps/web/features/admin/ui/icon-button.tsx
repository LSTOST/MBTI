"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  children: ReactNode;
  danger?: boolean;
};

export function IconButton({ label, children, danger, className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={clsx(
        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
        danger
          ? "text-[#FF453A] hover:bg-[rgba(255,69,58,0.1)]"
          : "text-[#8E8E93] hover:bg-[#1A1A24] hover:text-[#F5F5F7]",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
