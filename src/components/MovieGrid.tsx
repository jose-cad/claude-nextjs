"use client";

import type { MovieSummary } from "@/lib/tmdb/types";
import { MovieCard, type ListMarks } from "./MovieCard";

type Props = {
  movies: MovieSummary[];
  showBadges: boolean;
  getMarks?: (movieId: number) => ListMarks;
  onSelect: (movie: MovieSummary) => void;
};

export function MovieGrid({ movies, showBadges, getMarks, onSelect }: Props) {
  return (
    <ul className="grid grid-cols-3 gap-2 p-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} showBadge={showBadges} marks={getMarks?.(movie.id)} onSelect={onSelect} />
      ))}
    </ul>
  );
}
