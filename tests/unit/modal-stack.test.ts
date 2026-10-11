import { describe, expect, it, vi } from "vitest";
import { ModalStack } from "@/lib/modal-stack";

describe("ModalStack", () => {
  it("fecha só o modal do topo", () => {
    const stack = new ModalStack();
    const fecharDetalhes = vi.fn();
    const fecharLogin = vi.fn();
    stack.push(fecharDetalhes);
    stack.push(fecharLogin);

    expect(stack.closeTop()).toBe(true);
    expect(fecharLogin).toHaveBeenCalledTimes(1);
    expect(fecharDetalhes).not.toHaveBeenCalled();
    expect(stack.size).toBe(1);
  });

  it("remover um modal tira só ele da pilha", () => {
    const stack = new ModalStack();
    const a = vi.fn();
    const b = vi.fn();
    stack.push(a);
    stack.push(b);
    stack.remove(a);
    stack.closeTop();
    expect(b).toHaveBeenCalled();
    expect(stack.size).toBe(0);
  });

  it("pilha vazia não faz nada", () => {
    expect(new ModalStack().closeTop()).toBe(false);
  });
});
