const memory = new Map<string, string>();

/** localStorage com fallback em memória: funciona em aba anônima ou com cookies bloqueados. */
export const safeStorage = {
  get(key: string): string | null {
    try {
      const v = window.localStorage.getItem(key);
      if (v !== null) return v;
    } catch {
      /* bloqueado */
    }
    return memory.get(key) ?? null;
  },
  set(key: string, value: string): void {
    memory.set(key, value);
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* bloqueado: fica só na memória */
    }
  },
};
