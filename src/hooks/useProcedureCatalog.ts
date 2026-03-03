// src/hooks/useProcedureCatalog.ts
// Hook centralizado para carregar o catálogo de procedimentos (procedure_catalog)
// - Usa o service listActiveProcedures com cache em memória
// - Evita requisições repetidas ao navegar entre telas

import { useState, useEffect, useCallback } from "react";
import type { Procedure } from "../types/db";
import {
  listActiveProcedures,
  getCachedProcedureCatalog,
  updateProcedureDescription,
} from "../services/procedures/procedureService";
import { toast } from "react-hot-toast";

export interface UseProcedureCatalogResult {
  procedures: Procedure[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateDescription: (procedureId: string, description: string) => Promise<void>;
}

export function useProcedureCatalog(): UseProcedureCatalogResult {
  const [procedures, setProcedures] = useState<Procedure[]>(() => getCachedProcedureCatalog() ?? []);
  const [loading, setLoading] = useState<boolean>(!getCachedProcedureCatalog());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Se já temos cache, não precisamos buscar novamente neste mount
    if (getCachedProcedureCatalog()) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listActiveProcedures(true);
        if (!cancelled) {
          setProcedures(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.message || "Erro ao carregar catálogo de procedimentos.";
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Força refetch ignorando o cache
      const data = await listActiveProcedures(false);
      setProcedures(data);
    } catch (err: any) {
      const msg = err?.message || "Erro ao recarregar catálogo de procedimentos.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDescription = useCallback(
    async (procedureId: string, description: string) => {
      // Delega validação de tamanho/conteúdo ao service (Zod)
      await updateProcedureDescription(procedureId, description);
      setProcedures((prev) =>
        prev.map((p) =>
          p.id === procedureId ? { ...p, description: description.trim() } : p
        )
      );
    },
    []
  );

  return { procedures, loading, error, refresh, updateDescription };
}

export default useProcedureCatalog;

