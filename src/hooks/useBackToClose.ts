"use client";

import { useEffect, useRef } from "react";
import { ModalStack } from "@/lib/modal-stack";

const stack = new ModalStack();
let listening = false;

function listenOnce() {
  if (listening) return;
  listening = true;
  window.addEventListener("popstate", () => {
    stack.closeTop();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && stack.size > 0) window.history.back();
  });
}

/** Enquanto o modal está aberto, "voltar" e Esc o fecham (só o do topo). Devolve a função de fechar. */
export function useBackToClose(open: boolean, onClose: () => void): () => void {
  const onCloseRef = useRef(onClose);
  const pushed = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      pushed.current = false;
      return;
    }
    listenOnce();
    if (!pushed.current) {
      window.history.pushState(window.history.state, "");
      pushed.current = true;
    }
    const entry = () => onCloseRef.current();
    stack.push(entry);
    return () => stack.remove(entry);
  }, [open]);

  return () => window.history.back();
}
