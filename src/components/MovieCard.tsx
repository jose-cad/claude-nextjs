"use client";

import { posterUrl } from "@/lib/images";
import type { MovieSummary } from "@/lib/tmdb/types";
import { NetflixBadge } from "./NetflixBadge";

export type ListMarks = { want: boolean; favorite: boolean };

type Props = {
  movie: MovieSummary;
  showBadge: boolean;
  marks?: ListMarks;
  onSelect: (movie: MovieSummary) => void;
};

export function MovieCard({ movie, showBadge, marks, onSelect }: Props) {
  const src = posterUrl(movie.posterPath, "w342");
  const mark = marks?.favorite ? "favorite" : marks?.want ? "want" : null;

  return (
    <li>
      <button
        type="button"
        aria-label={movie.title}
        onClick={() => onSelect(movie)}
        className="relative block w-full overflow-hidden rounded-md bg-neutral-800 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <div className="aspect-[2/3] w-full">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- pôsteres já vêm no tamanho certo do TMDB
            <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center p-2 text-center text-xs text-neutral-200">{movie.title}</div>
          )}
        </div>
        {mark && (
          <span data-mark={mark} aria-hidden className="absolute right-1 top-1 rounded bg-black/75 px-1.5 py-0.5 text-xs">
            {mark === "favorite" ? "★" : "＋"}
          </span>
        )}
        {showBadge && movie.onNetflix !== null && (
          <span className="absolute bottom-1 left-1">
            <NetflixBadge onNetflix={movie.onNetflix} />
          </span>
        )}
      </button>
    </li>
  );
}
