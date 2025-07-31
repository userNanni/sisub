// Rancho.tsx

import { lazy, Suspense } from "react";

import { useState, useCallback, useMemo, type JSX } from "react";
import { Loader2, Settings, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useRanchoData,
  type PendingChange,
  type Selections,
  type DayUnits,
} from "@/components/hooks/useRanchoData";

import { DefaultUnitSelector } from "@/components/DefaultUnitSelector";
import { AlertMessages } from "@/components/AlertMessage";
import { PendingChangesStatus } from "@/components/PendingChangesStatus";
import {
  createEmptyDayMeals,
  formatDate,
  getDayOfWeek,
  isDateNear,
  type DayMeals,
} from "@/components/utils/RanchoUtils";
import { NEAR_DATE_THRESHOLD } from "@/components/constants/rancho";
import { DayCardSkeleton } from "@/components/DayCard";
import SimplifiedMilitaryStatsSkeleton from "~/components/SimplifiedMilitaryStatsSkeleton";

const SimplifiedMilitaryStats = lazy(
  () => import("@/components/SimplifiedMilitaryStats")
);
const DayCard = lazy(() => import("@/components/DayCard"));

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

  const [showDefaultUnitSelector, setShowDefaultUnitSelector] =
    useState<boolean>(false);
  const [isApplyingDefaultUnit, setIsApplyingDefaultUnit] =
    useState<boolean>(false);

  // Memoizar computações pesadas
  const computedData = useMemo(() => {
    const cardsWithoutUnit = dates.filter((date: string) => {
      const unit = dayUnits[date];
      return !unit || unit === "DIRAD";
    });

    const cardData: CardData[] = dates.map((date: string) => ({
      date,
      daySelections: selections[date] || createEmptyDayMeals(),
      dayUnit: dayUnits[date] || defaultUnit,
    }));

    return {
      cardsWithoutUnit,
      cardData,
    };
  }, [dates, dayUnits, selections, defaultUnit]);

  // Memoizar funções utilitárias
  const utilityFunctions = useMemo(
    () => ({
      isDateNear: (dateString: string): boolean =>
        isDateNear(dateString, NEAR_DATE_THRESHOLD),
    }),
    []
  );

  // Pré-computar TODOS os dados dos cards FORA do map usando useMemo
  const dayCardsProps = useMemo(() => {
    return computedData.cardData.map(({ date, daySelections, dayUnit }) => {
      // Usar função pura em vez de hook
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

  // Handlers otimizados
  const handlers = useMemo(
    () => ({
      handleMealToggle: (date: string, meal: keyof DayMeals): void => {
        if (utilityFunctions.isDateNear(date)) return;

        const currentValue = selections[date]?.[meal] || false;
        const newValue = !currentValue;
        const unidade = dayUnits[date] || defaultUnit;

        setSelections((prev: Selections) => ({
          ...prev,
          [date]: {
            ...prev[date],
            [meal]: newValue,
          },
        }));

        setPendingChanges((prev: PendingChange[]) => {
          const existingChangeIndex = prev.findIndex(
            (change) => change.date === date && change.meal === meal
          );

          if (existingChangeIndex >= 0) {
            const newChanges = [...prev];
            newChanges[existingChangeIndex] = {
              date,
              meal,
              value: newValue,
              unidade,
            };
            return newChanges;
          } else {
            return [...prev, { date, meal, value: newValue, unidade }];
          }
        });
      },

      handleUnitChange: (date: string, newUnit: string): void => {
        if (utilityFunctions.isDateNear(date)) return;

        setDayUnits((prev: DayUnits) => ({
          ...prev,
          [date]: newUnit,
        }));

        const dayMeals = selections[date];
        if (!dayMeals) return;

        const selectedMeals = Object.entries(dayMeals)
          .filter(([_, isSelected]) => isSelected)
          .map(([meal, value]) => ({
            date,
            meal: meal as keyof DayMeals,
            value,
            unidade: newUnit,
          }));

        if (selectedMeals.length === 0) return;

        setPendingChanges((prev: PendingChange[]) => {
          const filtered = prev.filter((change) => change.date !== date);
          return [...filtered, ...selectedMeals];
        });
      },

      handleRefresh: (): void => {
        loadExistingPrevisoes();
      },

      handleToggleUnitSelector: (): void => {
        setShowDefaultUnitSelector((prev) => !prev);
      },

      handleCancelUnitSelector: (): void => {
        setShowDefaultUnitSelector(false);
      },
    }),
    [
      utilityFunctions,
      selections,
      dayUnits,
      defaultUnit,
      setSelections,
      setPendingChanges,
      setDayUnits,
      loadExistingPrevisoes,
    ]
  );

  // Aplicar unidade padrão otimizado
  const applyDefaultUnitToAll = useCallback(async (): Promise<void> => {
    const { cardsWithoutUnit } = computedData;
    if (cardsWithoutUnit.length === 0) return;

    setIsApplyingDefaultUnit(true);

    try {
      const updatedUnits: DayUnits = { ...dayUnits };
      cardsWithoutUnit.forEach((date: string) => {
        updatedUnits[date] = defaultUnit;
      });
      setDayUnits(updatedUnits);

      const newPendingChanges: PendingChange[] = [];

      cardsWithoutUnit.forEach((date: string) => {
        const dayMeals = selections[date];
        if (dayMeals) {
          Object.entries(dayMeals)
            .filter(([_, isSelected]) => isSelected)
            .forEach(([meal, value]) => {
              newPendingChanges.push({
                date,
                meal: meal as keyof DayMeals,
                value,
                unidade: defaultUnit,
              });
            });
        }
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

  // Loading state
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          {
            <Button
              variant="outline"
              size="sm"
              onClick={handlers.handleToggleUnitSelector}
              className="text-orange-600 border-orange-600 hover:bg-orange-50 cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-2" />
              Unidade Padrão ({cardsWithoutUnit.length})
            </Button>
          }

          <Button
            variant="outline"
            size="sm"
            onClick={handlers.handleRefresh}
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
          onCancel={handlers.handleCancelUnitSelector}
          isApplying={isApplyingDefaultUnit}
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
                onMealToggle={handlers.handleMealToggle}
                onUnitChange={handlers.handleUnitChange}
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
