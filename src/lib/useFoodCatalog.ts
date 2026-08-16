import { useState, useEffect, useCallback } from "react";
import { kvGet, kvSet } from "./clientStorage";

export interface Alimento {
  id: number;
  nome: string;
  porcaoDesc: string;
  kcalPorcao: number;
  proteinaPorcao: number;
  carboPorcao: number;
  gorduraPorcao: number;
  origem: "foto" | "manual";
}

// Catalogo pessoal de alimentos — cadastrado manualmente ou via foto (IA).
// Cada item guarda os valores de UMA porcao de referencia (ex: "100g" ou
// "1 unidade"); ao logar numa refeicao, multiplica pela quantidade usada.
export function useFoodCatalog(userId: string | null | undefined) {
  const [ready, setReady] = useState(false);
  const [alimentos, setAlimentosState] = useState<Alimento[]>([]);

  useEffect(() => {
    if (!userId) return;
    setReady(false);
    (async () => {
      const v = await kvGet<Alimento[]>(`${userId}_alimentos`, []);
      setAlimentosState(v || []);
      setReady(true);
    })();
  }, [userId]);

  const salvar = useCallback(async (next: Alimento[]) => {
    setAlimentosState(next);
    await kvSet(`${userId}_alimentos`, next);
  }, [userId]);

  const addAlimento = useCallback((item: Omit<Alimento, "id">) => salvar([{ id: Date.now(), ...item }, ...alimentos]), [alimentos, salvar]);
  const editAlimento = useCallback((id: number, patch: Partial<Alimento>) => salvar(alimentos.map((a) => (a.id === id ? { ...a, ...patch } : a))), [alimentos, salvar]);
  const delAlimento = useCallback((id: number) => salvar(alimentos.filter((a) => a.id !== id)), [alimentos, salvar]);

  return { ready, alimentos, addAlimento, editAlimento, delAlimento };
}
