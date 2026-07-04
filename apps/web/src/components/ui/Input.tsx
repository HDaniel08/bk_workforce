import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, className = "", id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block text-sm font-semibold text-brown" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        className={[
          "mt-2 w-full rounded-md border border-brown/20 bg-cream/40 px-3 py-3 outline-none transition focus:border-red focus:ring-2 focus:ring-red/20",
          className
        ].join(" ")}
        {...props}
      />
    </label>
  );
}
