export function Credits() {
  return (
    <footer className="space-y-1 text-center text-xs text-neutral-500">
      <p>
        Este produto usa a API do{" "}
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="underline">
          TMDB
        </a>
        , mas não é endossado nem certificado pelo TMDB.
      </p>
      <p>
        Dados de onde assistir fornecidos pela{" "}
        <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer" className="underline">
          JustWatch
        </a>
        .
      </p>
    </footer>
  );
}
