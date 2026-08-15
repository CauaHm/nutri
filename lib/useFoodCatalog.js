"use client";
import { useState, useEffect, useCallback } from "react";
import { kvGet, kvSet } from "@/lib/clientStorage";

// Catalogo pessoal de alimentos — cadastrado manualmente ou via foto (IA).
// Cada item guarda os valores de UMA porcao de referencia (ex: "100g" ou
// "1 unidade"); ao logar numa refeicao, multiplica pela quantidade usada.
export function useFoodCatalog(userId) {
  const [ready, setReady] = useState(false);
  const [alimentos, setAlimentosState] = useState([]);

  useEffect(() => {
    if (!userId) return;
    setReady(false);
    (async () => {
      const v = await kvGet(`${userId}_alimentos`, []);
      setAlimentosState(v);
      setReady(true);
    })();
  }, [userId]);

  const salvar = useCallback(async (next) => {
    setAlimentosState(next);
    await kvSet(`${userId}_alimentos`, next);
  }, [userId]);

  const addAlimento = useCallback((item) => salvar([{ id: Date.now(), ...item }, ...alimentos]), [alimentos, salvar]);
  const editAlimento = useCallback((id, patch) => salvar(alimentos.map((a) => (a.id === id ? { ...a, ...patch } : a))), [alimentos, salvar]);
  const delAlimento = useCallback((id) => salvar(alimentos.filter((a) => a.id !== id)), [alimentos, salvar]);

  return { ready, alimentos, addAlimento, editAlimento, delAlimento };
}
