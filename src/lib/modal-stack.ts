/** Pilha dos modais abertos: o "voltar" e o Esc fecham só o do topo. */
export class ModalStack {
  private entries: Array<() => void> = [];

  push(close: () => void): void {
    this.entries.push(close);
  }

  remove(close: () => void): void {
    const index = this.entries.lastIndexOf(close);
    if (index >= 0) this.entries.splice(index, 1);
  }

  closeTop(): boolean {
    const top = this.entries.pop();
    top?.();
    return top !== undefined;
  }

  get size(): number {
    return this.entries.length;
  }
}
