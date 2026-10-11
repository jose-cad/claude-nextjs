import { describe, expect, it } from "vitest";
import { formatRuntime } from "@/lib/format";

describe("formatRuntime", () => {
  it("formata horas e minutos", () => {
    expect(formatRuntime(125)).toBe("2h 05min");
    expect(formatRuntime(60)).toBe("1h 00min");
  });

  it("formata só minutos abaixo de uma hora", () => {
    expect(formatRuntime(45)).toBe("45min");
  });

  it("devolve null sem duração", () => {
    expect(formatRuntime(null)).toBeNull();
  });
});
