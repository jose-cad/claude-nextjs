"use client";

import { useId } from "react";

type Props = { label: string } & React.InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, ...inputProps }: Props) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm text-neutral-300">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 focus:border-red-500 focus:outline-none"
      />
    </div>
  );
}
