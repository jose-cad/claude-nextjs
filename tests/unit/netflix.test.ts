import { describe, expect, it } from "vitest";
import { isOnNetflix } from "@/lib/netflix";

describe("isOnNetflix", () => {
  it("true quando a Netflix está na assinatura no Brasil", () => {
    expect(isOnNetflix({ results: { BR: { flatrate: [{ provider_id: 337 }, { provider_id: 8 }] } } }, [8])).toBe(true);
  });

  it("aceita qualquer um dos IDs configurados", () => {
    expect(isOnNetflix({ results: { BR: { flatrate: [{ provider_id: 1796 }] } } }, [8, 1796])).toBe(true);
  });

  it("false quando só está em outro país", () => {
    expect(isOnNetflix({ results: { US: { flatrate: [{ provider_id: 8 }] } } }, [8])).toBe(false);
  });

  it("false sem dados", () => {
    expect(isOnNetflix(undefined, [8])).toBe(false);
    expect(isOnNetflix({ results: {} }, [8])).toBe(false);
  });
});
