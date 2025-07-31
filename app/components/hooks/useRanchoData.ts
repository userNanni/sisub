import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/auth/auth";
import supabase from "@/utils/supabase";

const DEFAULT_UNIT = "DIRAD - DIRAD";
const DAYS_TO_SHOW = 30;
const AUTO_SAVE_DELAY = 1500;
const SUCCESS_MESSAGE_DURATION = 3000;

export interface DayMeals {
  cafe: boolean;
  almoco: boolean;
  janta: boolean;
  ceia: boolean;
}

export interface Selections {
  [date: string]: DayMeals;
}

export interface DayUnits {
  [date: string]: string;
}

export interface PendingChange {
  date: string;
  meal: keyof DayMeals;
  value: boolean;
  unidade: string;
}

export interface RanchoDataHook {
  success: string;
  error: string;
  isLoading: boolean;
  pendingChanges: PendingChange[];
  isSavingBatch: boolean;
  selections: Selections;
  dayUnits: DayUnits;
  defaultUnit: string;
  dates: string[];
  todayString: string;
  setSuccess: (msg: string) => void;
  setError: (msg: string) => void;
  setPendingChanges: React.Dispatch<React.SetStateAction<PendingChange[]>>;
  setSelections: React.Dispatch<React.SetStateAction<Selections>>;
  setDayUnits: React.Dispatch<React.SetStateAction<DayUnits>>;
  setDefaultUnit: (unit: string) => void;
  loadExistingPrevisoes: () => Promise<void>;
  savePendingChanges: () => Promise<void>;
  clearMessages: () => void;
}

const createEmptyDayMeals = (): DayMeals => ({
  cafe: false,
  almoco: false,
  janta: false,
  ceia: false,
});

const generateDates = (days: number): string[] => {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }

  return dates;
};

export const useRanchoData = (): RanchoDataHook => {
  const { user } = useAuth();

  const [isClient, setIsClient] = useState(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveOperationRef = useRef<Promise<void> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [success, setSuccessState] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);
  const [selections, setSelections] = useState<Selections>({});
  const [dayUnits, setDayUnits] = useState<DayUnits>({});
  const [defaultUnit, setDefaultUnit] = useState<string>(DEFAULT_UNIT);

  // Memorizar valores estáveis
  const dates = useMemo(() => generateDates(DAYS_TO_SHOW), []);
  const todayString = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Callbacks estáveis
  const clearMessages = useCallback(() => {
    setSuccessState("");
    setError("");
  }, []);

  const setSuccess = useCallback((msg: string) => {
    setSuccessState(msg);
    setError(""); 

    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }

    if (msg) {
      successTimerRef.current = setTimeout(() => {
        setSuccessState("");
      }, SUCCESS_MESSAGE_DURATION);
    }
  }, []);

  // Callback estável para setError
  const setErrorWithClear = useCallback((msg: string) => {
    setError(msg);
    setSuccessState("");
  }, []);

  // loadExistingPrevisoes com dependências estáveis
  const loadExistingPrevisoes = useCallback(async (): Promise<void> => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsLoading(true);
    setErrorWithClear("");

    try {
      const { data: previsoes, error: supabaseError } = await supabase
        .from("rancho_previsoes")
        .select("data, unidade, refeicao, vai_comer")
        .eq("user_id", user.id)
        .gte("data", dates[0])
        .lte("data", dates[dates.length - 1])
        .order("data", { ascending: true });

      if (signal.aborted) return;

      if (supabaseError) throw supabaseError;

      const initialSelections: Selections = {};
      const initialUnits: DayUnits = {};

      dates.forEach((date) => {
        initialSelections[date] = createEmptyDayMeals();
        initialUnits[date] = defaultUnit;
      });

      previsoes?.forEach((previsao) => {
        const { data, unidade, refeicao, vai_comer } = previsao;

        if (initialSelections[data] && refeicao in initialSelections[data]) {
          initialSelections[data][refeicao as keyof DayMeals] = vai_comer;
          initialUnits[data] = unidade;
        }
      });

      if (!signal.aborted) {
        setSelections(initialSelections);
        setDayUnits(initialUnits);
      }
    } catch (err) {
      if (!signal.aborted) {
        console.error("Erro ao carregar previsões:", err);
        setErrorWithClear("Erro ao carregar previsões existentes. Tente novamente.");
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [user?.id, dates, defaultUnit, setErrorWithClear]); // ✅ Dependências estáveis

  const savePendingChanges = useCallback(async (): Promise<void> => {
    if (!user?.id || pendingChanges.length === 0) return;

    if (saveOperationRef.current) {
      await saveOperationRef.current;
      return;
    }

    const saveOperation = async () => {
      setIsSavingBatch(true);
      setErrorWithClear("");

      try {
        const changesToSave = [...pendingChanges];

        const changesByDate = changesToSave.reduce((acc, change) => {
          if (!acc[change.date]) {
            acc[change.date] = [];
          }
          acc[change.date].push(change);
          return acc;
        }, {} as { [date: string]: PendingChange[] });

        const results = await Promise.allSettled(
          Object.entries(changesByDate).map(async ([date, dateChanges]) => {
            const { error: deleteError } = await supabase
              .from("rancho_previsoes")
              .delete()
              .eq("user_id", user.id)
              .eq("data", date);

            if (deleteError) throw deleteError;

            const recordsToInsert = dateChanges
              .filter((change) => change.value)
              .map((change) => ({
                data: change.date,
                unidade: change.unidade,
                user_id: user.id,
                refeicao: change.meal,
                vai_comer: true,
              }));

            if (recordsToInsert.length > 0) {
              const { error: insertError } = await supabase
                .from("rancho_previsoes")
                .insert(recordsToInsert);

              if (insertError) throw insertError;
            }

            return { date, changes: dateChanges.length };
          })
        );

        const successful = results.filter((result) => result.status === "fulfilled");
        const failed = results.filter((result) => result.status === "rejected");

        if (failed.length === 0) {
          setSuccess(`${changesToSave.length} alteração(ões) salva(s) com sucesso!`);
          setPendingChanges((prev) => 
            prev.filter(change => !changesToSave.some(saved => 
              saved.date === change.date && 
              saved.meal === change.meal && 
              saved.value === change.value
            ))
          );
        } else if (successful.length > 0) {
          const successCount = successful.reduce(
            (acc, result) => acc + (result as PromiseFulfilledResult<any>).value.changes,
            0
          );
          setSuccess(`${successCount} alteração(ões) salva(s). ${failed.length} data(s) falharam.`);

          const successfulDates = successful.map(
            (result) => (result as PromiseFulfilledResult<any>).value.date
          );
          setPendingChanges((prev) =>
            prev.filter((change) => !successfulDates.includes(change.date))
          );
        } else {
          throw new Error("Todas as operações falharam");
        }
      } catch (err) {
        console.error("Erro ao salvar mudanças:", err);
        setErrorWithClear("Erro ao salvar alterações. Tente novamente.");
      } finally {
        setIsSavingBatch(false);
        saveOperationRef.current = null;
      }
    };

    saveOperationRef.current = saveOperation();
    return saveOperationRef.current;
  }, [user?.id, pendingChanges, setSuccess, setErrorWithClear]);

  // ✅ Auto-save effect com dependência estável
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (pendingChanges.length === 0) return;

    autoSaveTimerRef.current = setTimeout(() => {
      savePendingChanges();
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [pendingChanges, savePendingChanges]); // ✅ Incluir savePendingChanges

  // ✅ Client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ✅ CORREÇÃO PRINCIPAL: Array simples e dependências estáveis
  useEffect(() => {
    if (isClient && user?.id) {
      loadExistingPrevisoes();
    }
  }, [isClient, user?.id, loadExistingPrevisoes]); // ✅ Corrigido: [isClient] em vez de [[isClient]]

  // ✅ Cleanup effect
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    success,
    error,
    isLoading,
    pendingChanges,
    isSavingBatch,
    selections,
    dayUnits,
    defaultUnit,
    dates,
    todayString,

    setSuccess,
    setError: setErrorWithClear,
    setPendingChanges,
    setSelections,
    setDayUnits,
    setDefaultUnit,

    loadExistingPrevisoes,
    savePendingChanges,
    clearMessages,
  };
};