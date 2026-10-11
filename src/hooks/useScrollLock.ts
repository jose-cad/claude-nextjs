"use client";

import { useEffect } from "react";

let locks = 0;

/** Trava a rolagem do fundo sem mudar a posição; funciona com modais empilhados. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    locks += 1;
    document.documentElement.style.overflow = "hidden";
    return () => {
      locks -= 1;
      if (locks === 0) document.documentElement.style.overflow = "";
    };
  }, [active]);
}
