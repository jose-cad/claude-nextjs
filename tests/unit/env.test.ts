import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("aplica os valores padrão", () => {
    const env = parseEnv({ TMDB_API_TOKEN: "token" });
    expect(env.TMDB_BASE_URL).toBe("https://api.themoviedb.org/3");
    expect(env.NETFLIX_PROVIDER_IDS).toEqual([8]);
  });

  it("lê vários IDs de provedor da Netflix", () => {
    expect(
      parseEnv({ TMDB_API_TOKEN: "t", NETFLIX_PROVIDER_IDS: "8, 1796" })
        .NETFLIX_PROVIDER_IDS,
    ).toEqual([8, 1796]);
  });

  it("recusa configuração sem token do TMDB", () => {
    expect(() => parseEnv({ TMDB_API_TOKEN: "" })).toThrow();
    expect(() => parseEnv({})).toThrow();
  });
});
