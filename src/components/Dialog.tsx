"use client";

import { useEffect, useRef } from "react";
import { useBackToClose } from "@/hooks/useBackToClose";
import { useScrollLock } from "@/hooks/useScrollLock";

type Props = {
  open: boolean;
  onClose: () => void;
  /** id do título do modal: vira o nome acessível do diálogo */
  labelledBy: string;
  /** "top" fica acima de outro modal aberto (ex.: login por cima dos detalhes) */
  layer?: "base" | "top";
  children: (close: () => void) => React.ReactNode;
};

export function Dialog({ open, onClose, labelledBy, layer = "base", children }: Props) {
  const close = useBackToClose(open, onClose);
  useScrollLock(open);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeButton.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${layer === "top" ? "z-[60]" : "z-50"} flex items-center justify-center bg-black/70 p-4`}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-lg bg-neutral-900 p-4 shadow-xl"
      >
        <button
          ref={closeButton}
          type="button"
          onClick={close}
          aria-label="Fechar"
          className="absolute right-2 top-2 rounded p-2 text-neutral-300 hover:text-white"
        >
          ✕
        </button>
        {children(close)}
      </div>
    </div>
  );
}
