"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 h-14 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b"
    >
      <ul className="mx-auto flex h-full max-w-5xl">
        <li className="flex-1">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className="flex h-full items-center justify-center text-sm font-medium text-white"
          >
            Catálogo
          </Link>
        </li>
      </ul>
    </nav>
  );
}
