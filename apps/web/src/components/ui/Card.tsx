import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div className={["rounded-lg bg-white p-4 shadow-soft sm:p-5", className].join(" ")} {...props}>
      {children}
    </div>
  );
}
