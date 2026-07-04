import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-red text-cream hover:bg-brown",
    secondary: "bg-brown text-cream hover:bg-red",
    ghost: "bg-white text-brown hover:bg-cream"
  };

  return (
    <button
      className={[
        "rounded-md px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      ].join(" ")}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
