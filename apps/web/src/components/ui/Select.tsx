import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, options, className = "", id, ...props }: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <label className="block text-sm font-semibold text-brown" htmlFor={selectId}>
      {label}
      <select
        id={selectId}
        className={[
          "mt-2 w-full rounded-md border border-brown/20 bg-cream/40 px-3 py-3 outline-none transition focus:border-red focus:ring-2 focus:ring-red/20",
          className
        ].join(" ")}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
