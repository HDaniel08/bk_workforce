import type { ReactNode } from "react";

interface BadgeProps {
  tone?: "green" | "red" | "brown";
  children: ReactNode;
}

export function Badge({ tone = "brown", children }: BadgeProps) {
  const tones = {
    green: "bg-green/10 text-green",
    red: "bg-red/10 text-red",
    brown: "bg-brown/10 text-brown"
  };

  return (
    <span className={["rounded-md px-2 py-1 text-xs font-bold", tones[tone]].join(" ")}>
      {children}
    </span>
  );
}
