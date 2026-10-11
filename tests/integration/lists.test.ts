import { describe, expect, it } from "vitest";
import { addToList, getListItems, removeFromList } from "@/lib/lists/service";
import { anonymousClient, newUser } from "./helpers";

const filme = (id: number) => ({ tmdbMovieId: id, title: `Filme ${id}`, posterPath: `/p${id}.jpg` });

describe("listas no Supabase", () => {
  it("salva em Quero assistir guardando título e pôster", async () => {
    const { client } = await newUser();
    await addToList(client, filme(1), "want");
    const items = await getListItems(client);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ tmdbMovieId: 1, title: "Filme 1", posterPath: "/p1.jpg", listType: "want" });
  });

  it("toque duplo (duas inserções ao mesmo tempo) não duplica", async () => {
    const { client } = await newUser();
    await Promise.all([addToList(client, filme(1), "want"), addToList(client, filme(1), "want")]);
    expect(await getListItems(client)).toHaveLength(1);
  });

  it("marcar Favorito tira de Quero assistir (gatilho no banco)", async () => {
    const { client } = await newUser();
    await addToList(client, filme(1), "want");
    await addToList(client, filme(1), "favorite");
    expect((await getListItems(client)).map((i) => i.listType)).toEqual(["favorite"]);
  });

  it("remove da lista", async () => {
    const { client } = await newUser();
    await addToList(client, filme(1), "want");
    await removeFromList(client, 1, "want");
    expect(await getListItems(client)).toHaveLength(0);
  });

  it("devolve os mais recentes primeiro", async () => {
    const { client } = await newUser();
    await addToList(client, filme(1), "want");
    await addToList(client, filme(2), "want");
    expect((await getListItems(client)).map((i) => i.tmdbMovieId)).toEqual([2, 1]);
  });

  it("RLS: cada pessoa só vê e apaga a própria lista", async () => {
    const ana = await newUser();
    const bia = await newUser();
    await addToList(ana.client, filme(1), "want");

    expect(await getListItems(bia.client)).toHaveLength(0);
    await removeFromList(bia.client, 1, "want");
    expect(await getListItems(ana.client)).toHaveLength(1);
  });

  it("RLS: ninguém consegue gravar na lista de outra pessoa", async () => {
    const ana = await newUser();
    const bia = await newUser();
    const { error } = await bia.client
      .from("list_items")
      .insert({ user_id: ana.userId, tmdb_movie_id: 5, list_type: "want", title: "Invasão" });
    expect(error?.code).toBe("42501");
    expect(await getListItems(ana.client)).toHaveLength(0);
  });

  it("RLS: visitante sem login não lê nada", async () => {
    const ana = await newUser();
    await addToList(ana.client, filme(1), "want");
    const { data } = await anonymousClient().from("list_items").select("*");
    expect(data ?? []).toHaveLength(0);
  });
});
