import { z } from "zod";

const schema = z.object({
  TMDB_API_TOKEN: z.string().min(1),
  TMDB_BASE_URL: z.string().url().default("https://api.themoviedb.org/3"),
  NETFLIX_PROVIDER_IDS: z
    .string()
    .default("8")
    .transform((value) =>
      value
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
});

export type Env = z.output<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  return schema.parse(source);
}

let cached: Env | undefined;

/** Variáveis do servidor, lidas só quando alguém precisa (o `next build` não exige segredos). */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
