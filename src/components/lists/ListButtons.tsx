"use client";

import type { ListType, MovieSnapshot } from "@/lib/lists/types";
import { useLists } from "./ListsProvider";

const BUTTONS: { listType: ListType; label: string; on: string; off: string }[] = [
  { listType: "want", label: "Quero assistir", on: "✓", off: "+" },
  { listType: "favorite", label: "Favorito", on: "★", off: "☆" },
];

export function ListButtons({ movie }: { movie: MovieSnapshot }) {
  const { marksFor, isPending, toggle } = useLists();
  const marks = marksFor(movie.tmdbMovieId);

  return (
    <div className="mt-4 flex gap-2">
      {BUTTONS.map((b) => {
        const active = marks[b.listType];
        return (
          <button
            key={b.listType}
            type="button"
            aria-pressed={active}
            disabled={isPending(movie.tmdbMovieId, b.listType)}
            onClick={() => toggle(movie, b.listType)}
            className={`flex-1 rounded-md border py-2 text-sm font-medium disabled:opacity-60 ${
              active ? "border-red-600 bg-red-600 text-white" : "border-neutral-700 text-neutral-200"
            }`}
          >
            <span aria-hidden>{active ? b.on : b.off}</span> {b.label}
          </button>
        );
      })}
    </div>
  );
}
