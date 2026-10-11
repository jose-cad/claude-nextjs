"use client";

import { useEffect, useRef } from "react";

type Props = { onVisible: () => void; disabled: boolean; watchKey: number };

/** Chama onVisible quando o fim da lista se aproxima. watchKey recria o observador após cada carga. */
export function InfiniteSentinel({ onVisible, disabled, watchKey }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onVisible);

  useEffect(() => {
    callback.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    const node = ref.current;
    if (disabled || !node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) callback.current();
    }, { rootMargin: "600px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [disabled, watchKey]);

  return <div ref={ref} aria-hidden className="h-1" />;
}
