// Rancho.tsx

import {
  lazy,
  Suspense,
  useState,
  useCallback,
  useMemo,
  type JSX,
} from "react";
import {
  Loader2,
  Settings,
  RefreshCw,
  Save,
  CalendarCheck,
  UtensilsCrossed, // Novo ícone
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useRanchoData,
  type PendingChange,
  type Selections,
  type DayUnits,
} from "@/components/hooks/useRanchoData";

import { DefaultUnitSelector } from "~/components/rancho/DefaultUnitSelector";
import { AlertMessages } from "@/components/AlertMessage";
import { PendingChangesStatus } from "~/components/rancho/PendingChangesStatus";
import {
  createEmptyDayMeals,
  formatDate,
  getDayOfWeek,
  isDateNear,
  type DayMeals,
} from "~/utils/RanchoUtils";
import { NEAR_DATE_THRESHOLD } from "@/components/constants/rancho";
import { DayCardSkeleton } from "~/components/rancho/DayCard";
import SimplifiedMilitaryStatsSkeleton from "~/components/rancho/SimplifiedMilitaryStatsSkeleton";
import BulkMealSelector from "~/components/rancho/BulkMealSelector"; // Novo import
import type { Route } from "./+types/rancho";

const SimplifiedMilitaryStats = lazy(
  () => import("~/components/rancho/SimplifiedMilitaryStats")
);
const DayCard = lazy(() => import("~/components/rancho/DayCard"));

/* ============================
   Constantes e utilitários puros
   ============================ */

const DIRAD_UNIT = "DIRAD" as const;

const WORKDAY_TEMPLATE_MEALS: ReadonlyArray<keyof DayMeals> = [
  "cafe",
  "almoco",
] as const;

interface CardData {
  date: string;
  daySelections: DayMeals;
  dayUnit: string;
}

// Função pura para calcular dados do card (sem hooks)
const getDayCardData = (
  date: string,
  todayString: string,
  daySelections: DayMeals
) => {
  const formattedDate = formatDate(date);
  const dayOfWeek = getDayOfWeek(date);
  const selectedMealsCount =
    Object.values(daySelections).filter(Boolean).length;
  const isDateNearValue = isDateNear(date, NEAR_DATE_THRESHOLD);
  const isToday = date === todayString;

  return {
    formattedDate,
    dayOfWeek,
    selectedMealsCount,
    isDateNear: isDateNearValue,
    isToday,
  };
};

const isWeekday = (dateString: string): boolean => {
  // Evitar problemas de timezone adicionando T00:00:00
  const d = new Date(`${dateString}T00:00:00`);
  const dow = d.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  return dow >= 1 && dow <= 5;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Previsão SISUB" },
    { name: "description", content: "Faça sua previsão" },
  ];
}

/* ============================
   Componente principal
   ============================ */

export default function Rancho(): JSX.Element {
  const {
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
    setError,
    setPendingChanges,
    setSelections,
    setDayUnits,
    setDefaultUnit,
    loadExistingPrevisoes,
    savePendingChanges,
    clearMessages,
  } = useRanchoData();

  const [showDefaultUnitSelector, setShowDefaultUnitSelector] = useState(false);
  const [isApplyingDefaultUnit, setIsApplyingDefaultUnit] = useState(false);

  // Novo: controle do seletor de refeições em massa
  const [showBulkMealSelector, setShowBulkMealSelector] = useState(false);
  const [isApplyingMealTemplate, setIsApplyingMealTemplate] = useState(false);

  /* ============================
     Derivações e memos
     ============================ */

  // Dias úteis não "próximos" (critérios para ações em massa por padrão)
  const weekdayTargets = useMemo(
    () =>
      dates.filter(
        (date) => isWeekday(date) && !isDateNear(date, NEAR_DATE_THRESHOLD)
      ),
    [dates]
  );

  const weekdayTargetsNeedingFillCount = useMemo(() => {
    return weekdayTargets.filter((date) => {
      const dm = selections[date] || createEmptyDayMeals();
      return WORKDAY_TEMPLATE_MEALS.some((meal) => !dm[meal]);
    }).length;
  }, [weekdayTargets, selections]);

  // Computa dados agregados usados em vários lugares
  const computedData = useMemo(() => {
    const cardsWithoutUnit = dates.filter((date) => {
      const unit = dayUnits[date];
      return !unit || unit === DIRAD_UNIT;
    });

    const cardData: CardData[] = dates.map((date) => ({
      date,
      daySelections: selections[date] || createEmptyDayMeals(),
      dayUnit: dayUnits[date] || defaultUnit,
    }));

    return { cardsWithoutUnit, cardData };
  }, [dates, dayUnits, selections, defaultUnit]);

  // Pré-computar props dos cards
  const dayCardsProps = useMemo(() => {
    return computedData.cardData.map(({ date, daySelections, dayUnit }) => {
      const dayCardData = getDayCardData(date, todayString, daySelections);
      return {
        key: date,
        date,
        daySelections,
        dayUnit,
        defaultUnit,
        ...dayCardData,
        pendingChanges,
        isSaving: false,
      };
    });
  }, [computedData.cardData, todayString, defaultUnit, pendingChanges]);

  /* ============================
     Callbacks
     ============================ */

  const handleMealToggle = useCallback(
    (date: string, meal: keyof DayMeals): void => {
      if (isDateNear(date, NEAR_DATE_THRESHOLD)) return;

      const currentValue = selections[date]?.[meal] || false;
      const newValue = !currentValue;
      const unidade = dayUnits[date] || defaultUnit;

      // Corrige possível spread de undefined
      setSelections((prev: Selections) => {
        const existing = prev[date] ?? createEmptyDayMeals();
        return {
          ...prev,
          [date]: {
            ...existing,
            [meal]: newValue,
          },
        };
      });

      setPendingChanges((prev: PendingChange[]) => {
        const idx = prev.findIndex((c) => c.date === date && c.meal === meal);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { date, meal, value: newValue, unidade };
          return copy;
        }
        return [...prev, { date, meal, value: newValue, unidade }];
      });
    },
    [selections, dayUnits, defaultUnit, setSelections, setPendingChanges]
  );

  const handleUnitChange = useCallback(
    (date: string, newUnit: string): void => {
      if (isDateNear(date, NEAR_DATE_THRESHOLD)) return;

      setDayUnits((prev: DayUnits) => ({ ...prev, [date]: newUnit }));

      const dayMeals = selections[date];
      if (!dayMeals) return;

      const selectedMeals: PendingChange[] = Object.entries(dayMeals)
        .filter(([, isSelected]) => isSelected)
        .map(([meal, value]) => ({
          date,
          meal: meal as keyof DayMeals,
          value,
          unidade: newUnit,
        }));

      if (!selectedMeals.length) return;

      setPendingChanges((prev: PendingChange[]) => {
        const filtered = prev.filter((c) => c.date !== date);
        return [...filtered, ...selectedMeals];
      });
    },
    [selections, setDayUnits, setPendingChanges]
  );

  const handleRefresh = useCallback((): void => {
    loadExistingPrevisoes();
  }, [loadExistingPrevisoes]);

  const handleToggleUnitSelector = useCallback((): void => {
    setShowDefaultUnitSelector((prev) => !prev);
  }, []);

  const handleCancelUnitSelector = useCallback((): void => {
    setShowDefaultUnitSelector(false);
  }, []);

  const applyDefaultUnitToAll = useCallback(async (): Promise<void> => {
    const { cardsWithoutUnit } = computedData;
    if (cardsWithoutUnit.length === 0) return;

    setIsApplyingDefaultUnit(true);

    try {
      const updatedUnits: DayUnits = { ...dayUnits };
      cardsWithoutUnit.forEach((date) => {
        updatedUnits[date] = defaultUnit;
      });
      setDayUnits(updatedUnits);

      const newPendingChanges: PendingChange[] = [];

      cardsWithoutUnit.forEach((date) => {
        const dayMeals = selections[date];
        if (!dayMeals) return;

        Object.entries(dayMeals)
          .filter(([, isSelected]) => isSelected)
          .forEach(([meal, value]) => {
            newPendingChanges.push({
              date,
              meal: meal as keyof DayMeals,
              value,
              unidade: defaultUnit,
            });
          });
      });

      if (newPendingChanges.length > 0) {
        setPendingChanges((prev: PendingChange[]) => {
          const filtered = prev.filter(
            (change) => !cardsWithoutUnit.includes(change.date)
          );
          return [...filtered, ...newPendingChanges];
        });
      }

      setSuccess(
        `Unidade padrão "${defaultUnit}" aplicada a ${cardsWithoutUnit.length} card(s)!`
      );
      setShowDefaultUnitSelector(false);
    } catch (err) {
      console.error("Erro ao aplicar unidade padrão:", err);
      setError("Erro ao aplicar unidade padrão. Tente novamente.");
    } finally {
      setIsApplyingDefaultUnit(false);
    }
  }, [
    computedData,
    dayUnits,
    defaultUnit,
    selections,
    setDayUnits,
    setPendingChanges,
    setSuccess,
    setError,
  ]);

  // Aplicar template de refeições em massa (fill-missing | override) somente em dias úteis por padrão
  const applyMealTemplateToAll = useCallback(
    async (
      template: DayMeals,
      options: { mode: "fill-missing" | "override" }
    ): Promise<void> => {
      const targetDates = weekdayTargets; // dias úteis não próximos
      if (!targetDates.length) {
        setShowBulkMealSelector(false);
        return;
      }

      setIsApplyingMealTemplate(true);
      try {
        const newChanges: PendingChange[] = [];
        const afterByDate: Record<string, DayMeals> = {};

        targetDates.forEach((date) => {
          const before = selections[date] || createEmptyDayMeals();
          const after: DayMeals = { ...before };

          if (options.mode === "override") {
            // força o template em todos os meals (e desmarca os que não estão no template)
            (Object.keys(after) as (keyof DayMeals)[]).forEach((k) => {
              after[k] = Boolean(template[k]);
            });
          } else {
            // fill-missing: só marca onde estava false e o template pede true
            (Object.keys(after) as (keyof DayMeals)[]).forEach((k) => {
              if (template[k]) after[k] = after[k] || true;
            });
          }

          const unidadeParaDia =
            dayUnits[date] && dayUnits[date] !== DIRAD_UNIT
              ? dayUnits[date]
              : defaultUnit;

          // Gerar PendingChanges para qualquer alteração (true ou false)
          (Object.keys(after) as (keyof DayMeals)[]).forEach((k) => {
            if (after[k] !== before[k]) {
              newChanges.push({
                date,
                meal: k,
                value: after[k],
                unidade: unidadeParaDia,
              });
            }
          });

          afterByDate[date] = after;
        });

        if (newChanges.length === 0) {
          setSuccess(
            "Nenhuma alteração necessária para aplicar o template em dias úteis."
          );
          setShowBulkMealSelector(false);
          return;
        }

        // Atualiza selections
        setSelections((prev) => {
          const next: Selections = { ...prev };
          targetDates.forEach((date) => {
            next[date] = afterByDate[date];
          });
          return next;
        });

        // Atualiza pendingChanges (remove duplicadas por date+meal)
        setPendingChanges((prev) => {
          const toRemove = new Set(
            newChanges.map((c) => `${c.date}|${String(c.meal)}`)
          );
          const filtered = prev.filter(
            (c) => !toRemove.has(`${c.date}|${String(c.meal)}`)
          );
          return [...filtered, ...newChanges];
        });

        setSuccess(
          `Template de refeições aplicado a ${targetDates.length} dia(s) úteis no modo ${
            options.mode === "override" ? "sobrescrever" : "preencher"
          }: ${newChanges.length} alteração(ões).`
        );
        setShowBulkMealSelector(false);
      } catch (err) {
        console.error("Erro ao aplicar template de refeições:", err);
        setError("Erro ao aplicar template de refeições. Tente novamente.");
      } finally {
        setIsApplyingMealTemplate(false);
      }
    },
    [
      weekdayTargets,
      selections,
      dayUnits,
      defaultUnit,
      setSelections,
      setPendingChanges,
      setSuccess,
      setError,
    ]
  );

  /* ============================
     Loading state
     ============================ */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando previsões...</p>
        </div>
      </div>
    );
  }

  const { cardsWithoutUnit } = computedData;

  /* ============================
     Render
     ============================ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleUnitSelector}
            className="text-orange-600 border-orange-600 hover:bg-orange-50 cursor-pointer"
          >
            <Settings className="h-4 w-4 mr-2" />
            Unidade Padrão ({cardsWithoutUnit.length})
          </Button>

          {/* Novo botão: Refeições em Massa (mostra quantidade de dias úteis que serão afetados) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkMealSelector(!showBulkMealSelector)}
            disabled={isLoading}
            className="text-green-600 border-green-600 hover:bg-green-50 cursor-pointer"
          >
            <UtensilsCrossed className="h-4 w-4 mr-2" />
            Refeições em Massa ({weekdayTargets.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Seletor de Unidade Padrão */}
      {showDefaultUnitSelector && (
        <DefaultUnitSelector
          defaultUnit={defaultUnit}
          setDefaultUnit={setDefaultUnit}
          cardsWithoutUnit={cardsWithoutUnit}
          onApply={applyDefaultUnitToAll}
          onCancel={handleCancelUnitSelector}
          isApplying={isApplyingDefaultUnit}
        />
      )}

      {/* Novo: Seletor de Refeições em Massa (usa somente dias úteis não próximos) */}
      {showBulkMealSelector && (
        <BulkMealSelector
          targetDates={weekdayTargets} // dias úteis por padrão
          initialTemplate={{ cafe: true, almoco: true }} // padrão útil inicial
          onApply={applyMealTemplateToAll}
          onCancel={() => setShowBulkMealSelector(false)}
          isApplying={isApplyingMealTemplate}
        />
      )}

      <div className="min-h-10">
        {/* Alertas */}
        <AlertMessages
          success={success}
          error={error}
          onClearMessages={clearMessages}
        />

        {/* Status de salvamento */}
        <PendingChangesStatus
          pendingChanges={pendingChanges}
          isSavingBatch={isSavingBatch}
        />
      </div>

      {/* Estatísticas Militares */}
      <Suspense fallback={<SimplifiedMilitaryStatsSkeleton />}>
        <SimplifiedMilitaryStats selections={selections} dates={dates} />
      </Suspense>

      {/* Cards Container */}
      <div className="overflow-x-auto pb-4">
        <div className="flex space-x-4 min-w-max p-2">
          {dayCardsProps.map((cardProps) => (
            <Suspense fallback={<DayCardSkeleton />} key={cardProps.key}>
              <DayCard
                {...cardProps}
                onMealToggle={handleMealToggle}
                onUnitChange={handleUnitChange}
              />
            </Suspense>
          ))}
        </div>
      </div>

      {/* Botão de salvar manual */}
      {pendingChanges.length > 0 && (
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={savePendingChanges}
            disabled={isSavingBatch}
            className="shadow-lg cursor-pointer"
            size="lg"
          >
            {isSavingBatch ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar {pendingChanges.length} alteração(ões)
          </Button>
        </div>
      )}
    </div>
  );
}
