import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/lib/return-path";

describe("safeReturnPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeReturnPath("/redefinir-senha")).toBe("/redefinir-senha");
  });

  it("usa / quando não há valor", () => {
    expect(safeReturnPath(null)).toBe("/");
    expect(safeReturnPath("")).toBe("/");
  });

  it("recusa endereços externos", () => {
    expect(safeReturnPath("https://site-externo.com")).toBe("/");
    expect(safeReturnPath("//site-externo.com")).toBe("/");
    expect(safeReturnPath("/\\site-externo.com")).toBe("/");
  });
});
