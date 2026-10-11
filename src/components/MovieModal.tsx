"use client";

import { useEffect, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatRuntime } from "@/lib/format";
import { posterUrl } from "@/lib/images";
import type { MovieDetails, MovieSummary } from "@/lib/tmdb/types";
import { Dialog } from "./Dialog";
import { NetflixBadge } from "./NetflixBadge";

export type ModalMovie = { tmdbMovieId: number; title: string; posterPath: string | null };

type Props = {
  movie: MovieSummary | null;
  onClose: () => void;
  actions?: (movie: ModalMovie) => React.ReactNode;
};

export function MovieModal({ movie, onClose, actions }: Props) {
  return (
    <Dialog open={movie !== null} onClose={onClose} labelledBy="movie-modal-title">
      {() => movie && <MovieModalContent movie={movie} actions={actions} />}
    </Dialog>
  );
}

function MovieModalContent({ movie, actions }: { movie: MovieSummary; actions?: Props["actions"] }) {
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<MovieDetails>(`/api/filmes/${movie.id}`)
      .then((data) => active && setDetails(data))
      .catch((e) => active && setError(errorMessage(e)));
    return () => {
      active = false;
    };
  }, [movie.id]);

  const shown = details ?? movie;
  const onNetflix = details ? details.onNetflix : movie.onNetflix;
  const poster = posterUrl(shown.posterPath, "w342");
  const meta = [shown.year, details ? formatRuntime(details.runtimeMinutes) : null].filter(Boolean).join(" · ");

  return (
    <>
      <div className="flex gap-4">
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element -- imagem do TMDB no tamanho certo
          <img src={poster} alt="" className="w-24 shrink-0 self-start rounded" />
        )}
        <div className="min-w-0 space-y-1 pr-8">
          <h2 id="movie-modal-title" className="text-lg font-semibold">
            {shown.title}
          </h2>
          {meta && <p className="text-sm text-neutral-400">{meta}</p>}
          {details && details.genres.length > 0 && <p className="text-sm text-neutral-400">{details.genres.join(", ")}</p>}
          {onNetflix !== null && <NetflixBadge onNetflix={onNetflix} />}
        </div>
      </div>

      {error && (
        <p role="status" className="mt-4 text-sm text-neutral-400">
          {error}
        </p>
      )}
      {!details && !error && (
        <p role="status" className="mt-4 text-sm text-neutral-400">
          Carregando...
        </p>
      )}
      {details && (
        <div className="mt-4 space-y-3 text-sm">
          <p>{details.overview ?? "Sinopse indisponível."}</p>
          {details.cast.length > 0 && <p className="text-neutral-400">Elenco: {details.cast.join(", ")}</p>}
          {details.trailerUrl && (
            <a href={details.trailerUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-red-400 underline">
              Ver trailer no YouTube
            </a>
          )}
        </div>
      )}

      {actions?.({ tmdbMovieId: movie.id, title: shown.title, posterPath: shown.posterPath })}
    </>
  );
}
