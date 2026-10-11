"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth/AuthProvider";

const item = "flex h-full w-full items-center justify-center text-sm font-medium";

export function NavBar() {
  const pathname = usePathname();
  const { user, openAuth } = useAuth();
  const links = user
    ? [
        { href: "/", label: "Catálogo" },
        { href: "/listas", label: "Minhas listas" },
        { href: "/conta", label: "Conta" },
      ]
    : [{ href: "/", label: "Catálogo" }];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 h-14 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b"
    >
      <ul className="mx-auto flex h-full max-w-5xl">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="flex-1">
              <Link href={link.href} aria-current={active ? "page" : undefined} className={`${item} ${active ? "text-white" : "text-neutral-400"}`}>
                {link.label}
              </Link>
            </li>
          );
        })}
        {!user && (
          <li className="flex-1">
            <button type="button" onClick={() => openAuth()} className={`${item} text-neutral-400`}>
              Entrar
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
