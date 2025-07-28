import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useAuth } from "../auth/auth";
import supabase from "@/utils/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Coffee,
  Utensils,
  Moon,
  Sun,
  Loader2,
  CheckCircle,
  Building2,
  LockKeyhole,
  RefreshCw,
  Save,
  AlertTriangle,
  MapPin,
  Clock,
  TrendingUp,
  CalendarDays,
  Settings,
} from "lucide-react";
import type { Route } from "./+types/rancho";

// Tipos melhorados
type MealType = "cafe" | "almoco" | "janta" | "ceia";

interface RanchoPrevisao {
  id?: string;
  data: string;
  unidade: string;
  user_id: string;
  refeicao: MealType;
  vai_comer: boolean;
  created_at?: string;
}

interface DayMeals {
  cafe: boolean;
  almoco: boolean;
  janta: boolean;
  ceia: boolean;
}

interface DayUnits {
  [date: string]: string;
}

interface PendingChange {
  date: string;
  meal: MealType;
  value: boolean;
  unidade: string;
}

interface MealTypeConfig {
  value: MealType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  time: string;
}

interface UnidadeOption {
  value: string;
  label: string;
}

// Constantes otimizadas - movidas para fora do componente
const UNIDADES_DISPONIVEIS: readonly UnidadeOption[] = [
  { value: "GAP-RJ - HCA", label: "GAP-RJ - HCA" },
  { value: "GAP-RJ - GAP SEDE", label: "GAP-RJ - GAP SEDE" },
  { value: "GAP-RJ - GARAGEM", label: "GAP-RJ - GARAGEM" },
  { value: "GAP-RJ - PAME", label: "GAP-RJ - PAME" },
  { value: "GAP-GL - GAP (BAGL)", label: "GAP-GL - GAP (BAGL)" },
  { value: "GAP-GL - CGABEG", label: "GAP-GL - CGABEG" },
  { value: "GAP-GL - HFAG", label: "GAP-GL - HFAG" },
  { value: "GAP-GL - CEMAL", label: "GAP-GL - CEMAL" },
  { value: "GAP-GL - PAMB", label: "GAP-GL - PAMB" },
  { value: "DIRAD - DIRAD", label: "DIRAD - DIRAD" },
  { value: "GAP-AF - BAAF (GAP-AF)", label: "GAP-AF - BAAF (GAP-AF)" },
  { value: "GAP-AF - CPA-AF", label: "GAP-AF - CPA-AF" },
  { value: "GAP-AF - HAAF", label: "GAP-AF - HAAF" },
  { value: "GAP-AF - UNIFA", label: "GAP-AF - UNIFA" },
  { value: "BASC - BASC", label: "BASC - BASC" },
  { value: "GAP-SP - BASP", label: "GAP-SP - BASP" },
  { value: "GAP-SP - PAMA-SP", label: "GAP-SP - PAMA-SP" },
  { value: "GAP-SP - GAP-SP", label: "GAP-SP - GAP-SP" },
  { value: "GAP-SP - HFASP", label: "GAP-SP - HFASP" },
  { value: "GAP-SP - BAST", label: "GAP-SP - BAST" },
  { value: "GAP-SP - COMGAP", label: "GAP-SP - COMGAP" },
  { value: "AFA - FAYS", label: "AFA - FAYS" },
  { value: "AFA - AFA", label: "AFA - AFA" },
  { value: "EEAR - HOSPITAL", label: "EEAR - HOSPITAL" },
  { value: "EEAR - EEAR (oficiais)", label: "EEAR - EEAR (cozinha oficiais)" },
  { value: "EEAR - EEAR (alunos)", label: "EEAR - EEAR (cozinha alunos)" },
  { value: "GAP-SJ - IEAV", label: "GAP-SJ - IEAV" },
  { value: "GAP-SJ - GAP-SJ", label: "GAP-SJ - GAP-SJ" },
  { value: "EPCAR - EPCAR", label: "EPCAR - EPCAR" },
  { value: "GAP-LS - CIAAR", label: "GAP-LS - CIAAR" },
  { value: "GAP-LS - PAMA-LS", label: "GAP-LS - PAMA-LS" },
  { value: "GAP-LS - ESQUADRAO DE SAUDE DE LS", label: "GAP-LS - ESQUADRAO DE SAUDE DE LS" },
  { value: "BASM - BASM", label: "BASM - BASM" },
  { value: "GAP-CO - BACO", label: "GAP-CO - BACO" },
  { value: "GAP-CO - GAP-CO", label: "GAP-CO - GAP-CO" },
  { value: "GAP-CO - HACO", label: "GAP-CO - HACO" },
  { value: "BAFL - BAFL", label: "BAFL - BAFL" },
  { value: "CINDACTA 2 - CINDACTA II", label: "CINDACTA 2 - CINDACTA II" },
  { value: "GAP-BE - BABE", label: "GAP-BE - BABE" },
  { value: "GAP-BE - GAP-BE (I COMAR)", label: "GAP-BE - GAP-BE (I COMAR)" },
  { value: "GAP-BE - COMARA", label: "GAP-BE - COMARA" },
  { value: "GAP-BE - HABE", label: "GAP-BE - HABE" },
  { value: "GAP-MN - DACO-MN", label: "GAP-MN - DACO-MN" },
  { value: "GAP-MN - GAP-MN", label: "GAP-MN - GAP-MN" },
  { value: "GAP-MN - CINDACTA IV", label: "GAP-MN - CINDACTA IV (em fase de ativação)" },
  { value: "GAP-MN - HAMN", label: "GAP-MN - HAMN" },
  { value: "BABV - BABV", label: "BABV - BABV" },
  { value: "BAPV - BAPV", label: "BAPV - BAPV" },
  { value: "CLA - CLA-AK", label: "CLA - CLA-AK" },
  { value: "BAFZ - BAFZ", label: "BAFZ - BAFZ" },
  { value: "BANT - BANT", label: "BANT - BANT" },
  { value: "BANT - CLBI", label: "BANT - CLBI" },
  { value: "GAP-RF - BARF", label: "GAP-RF - BARF" },
  { value: "GAP-RF - HARF", label: "GAP-RF - HARF" },
  { value: "GAP-RF - GAP-RF", label: "GAP-RF - GAP-RF" },
  { value: "BASV - BASV", label: "BASV - BASV" },
  { value: "BASV - CEMCOHA", label: "BASV - CEMCOHA" },
  { value: "GAP-DF - BABR-SUL", label: "GAP-DF - BABR-SUL" },
  { value: "GAP-DF - CACHIMBO-CPBV", label: "GAP-DF - CACHIMBO-CPBV" },
  { value: "GAP-DF - HFAB", label: "GAP-DF - HFAB" },
  { value: "GAP-DF - GAP DF – NORTE", label: "GAP-DF - GAP DF – NORTE" },
  { value: "GAP-BR - GAP BR", label: "GAP-BR - GAP BR" },
  { value: "GABAER - GABAER", label: "GABAER - GABAER" },
  { value: "BAAN - BAAN", label: "BAAN - BAAN" },
  { value: "BACG - BACG", label: "BACG - BACG" },
] as const;

const MEAL_TYPES: readonly MealTypeConfig[] = [
  {
    value: "cafe",
    label: "Café",
    icon: Coffee,
    color: "bg-orange-100 text-orange-800",
    time: "06:30",
  },
  {
    value: "almoco",
    label: "Almoço",
    icon: Utensils,
    color: "bg-green-100 text-green-800",
    time: "11:30",
  },
  {
    value: "janta",
    label: "Jantar",
    icon: Moon,
    color: "bg-blue-100 text-blue-800",
    time: "17:30",
  },
  {
    value: "ceia",
    label: "Ceia",
    icon: Sun,
    color: "bg-purple-100 text-purple-800",
    time: "21:00",
  },
] as const;

const DEFAULT_UNIT = "DIRAD - DIRAD";
const DAYS_TO_SHOW = 30;
const NEAR_DATE_THRESHOLD = 2;
const AUTO_SAVE_DELAY = 1500;

// Utilitários otimizados
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

// Componente de estatísticas otimizado
interface MilitaryStatsProps {
  selections: Record<string, DayMeals>;
  dayUnits: DayUnits;
  dates: readonly string[];
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Previsão SISUB" },
    { name: "description", content: "faça seu raçoamento" },
  ];
}

const MilitaryStats = memo<MilitaryStatsProps>(({ selections, dayUnits, dates }) => {
  const stats = useMemo(() => {
    const totalDays = dates.length;
    let daysWithMeals = 0;
    let totalMeals = 0;
    let nextWeekMeals = 0;
    const unitsSet = new Set<string>();

    dates.forEach((date, index) => {
      const daySelections = selections[date];
      const unit = dayUnits[date];
      
      if (unit) unitsSet.add(unit);
      
      if (daySelections) {
        const mealsCount = Object.values(daySelections).filter(Boolean).length;
        if (mealsCount > 0) {
          daysWithMeals++;
          totalMeals += mealsCount;
          
          // Próximos 7 dias
          if (index < 7) {
            nextWeekMeals += mealsCount;
          }
        }
      }
    });

    return {
      totalDays,
      daysWithMeals,
      totalMeals,
      unitsUsed: unitsSet.size,
      nextWeekMeals,
      averageMealsPerDay: daysWithMeals > 0 ? (totalMeals / daysWithMeals).toFixed(1) : "0",
    };
  }, [selections, dayUnits, dates]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center space-x-2">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-600">Dias com Refeições</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.daysWithMeals}/{stats.totalDays}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center space-x-2">
          <Utensils className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-600">Total de Refeições</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalMeals}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-purple-600" />
          <div>
            <p className="text-sm font-medium text-gray-600">Unidades Utilizadas</p>
            <p className="text-2xl font-bold text-gray-900">{stats.unitsUsed}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-orange-600" />
          <div>
            <p className="text-sm font-medium text-gray-600">Próximos 7 Dias</p>
            <p className="text-2xl font-bold text-gray-900">{stats.nextWeekMeals}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-gray-600">Média/Dia</p>
            <p className="text-2xl font-bold text-gray-900">{stats.averageMealsPerDay}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

MilitaryStats.displayName = "MilitaryStats";

// Componente de botão de refeição otimizado
interface MealButtonProps {
  meal: MealTypeConfig;
  isSelected: boolean;
  onToggle: () => void;
  disabled: boolean;
}

const MealButton = memo<MealButtonProps>(({ meal, isSelected, onToggle, disabled }) => {
  const Icon = meal.icon;

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`
        w-full p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer
        ${isSelected
          ? "border-green-500 bg-green-50 shadow-sm"
          : "border-gray-200 hover:border-gray-300 bg-white"
        }
        ${disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:shadow-sm active:scale-95"
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon className={`h-5 w-5 ${isSelected ? "text-green-600" : "text-gray-500"}`} />
          <div className="text-left">
            <span className={`font-medium block ${isSelected ? "text-green-900" : "text-gray-700"}`}>
              {meal.label}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isSelected ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              ✓ Confirmado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-600">
              ✗ Não vai
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
});

MealButton.displayName = "MealButton";

// Componente de card de dia otimizado
interface DayCardProps {
  date: string;
  daySelections: DayMeals;
  dayUnit: string;
  defaultUnit: string;
  onMealToggle: (date: string, meal: MealType) => void;
  onUnitChange: (date: string, newUnit: string) => void;
  formatDate: (dateString: string) => string;
  getDayOfWeek: (dateString: string) => string;
  getSelectedMealsCount: (date: string) => number;
  isDateNear: (dateString: string) => boolean;
  todayString: string;
  pendingChanges: readonly PendingChange[];
  savingCards: Record<string, boolean>;
}

const DayCard = memo<DayCardProps>(({
  date,
  daySelections,
  dayUnit,
  defaultUnit,
  onMealToggle,
  onUnitChange,
  formatDate,
  getDayOfWeek,
  getSelectedMealsCount,
  isDateNear,
  todayString,
  pendingChanges,
  savingCards,
}) => {
  const isSaving = savingCards[date] || false;
  const isToday = date === todayString;
  const isNear = isDateNear(date);
  const selectedCount = getSelectedMealsCount(date);
  const hasPendingChanges = pendingChanges.some((change) => change.date === date);
  const hasDefaultUnit = dayUnit === defaultUnit || !dayUnit || dayUnit === "DIRAD";

  const handleMealToggle = useCallback((meal: MealType) => {
    onMealToggle(date, meal);
  }, [date, onMealToggle]);

  const handleUnitChange = useCallback((newUnit: string) => {
    onUnitChange(date, newUnit);
  }, [date, onUnitChange]);

  return (
    <Card
      className={`w-80 flex-shrink-0 transition-all duration-200 m-2 ${
        isNear && !isToday ? "ring-2 ring-gray-400 bg-gray-50" : ""
      } ${isToday ? "ring-2 ring-blue-500 bg-blue-50" : ""} ${
        hasPendingChanges ? "ring-2 ring-orange-400" : ""
      } ${hasDefaultUnit ? "border-l-4 border-l-orange-400" : ""}`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{formatDate(date)}</span>
            {isToday && <Badge variant="secondary">Hoje</Badge>}
            {hasPendingChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Pendente
              </Badge>
            )}
            {hasDefaultUnit && (
              <Badge variant="outline" className="text-orange-600 border-orange-400 bg-orange-50">
                Padrão
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isNear && <LockKeyhole className="h-4 w-4 text-gray-500" />}
          </div>
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span className="capitalize">{getDayOfWeek(date)}</span>
          {selectedCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {selectedCount}/4 refeições
            </Badge>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Seletor de Unidade */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center space-x-1">
            <MapPin className="h-4 w-4" />
            <span>Unidade:</span>
            {hasDefaultUnit && <span className="text-xs text-orange-600">(padrão)</span>}
          </Label>
          <Select value={dayUnit} onValueChange={handleUnitChange} disabled={isNear}>
            <SelectTrigger className={`w-full cursor-pointer ${hasDefaultUnit ? "border-orange-200 bg-orange-50" : ""}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIDADES_DISPONIVEIS.map((unidade) => (
                <SelectItem className="cursor-pointer" key={unidade.value} value={unidade.value}>
                  {unidade.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Refeições */}
        <div className="space-y-3">
          {MEAL_TYPES.map((meal) => (
            <MealButton
              key={meal.value}
              meal={meal}
              isSelected={daySelections[meal.value]}
              onToggle={() => handleMealToggle(meal.value)}
              disabled={isSaving || isNear}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

DayCard.displayName = "DayCard";

// Componente principal otimizado
export default function Rancho() {
  const { user } = useAuth();
  
  // Estados principais
  const [success, setSuccess] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);
  const [selections, setSelections] = useState<Record<string, DayMeals>>({});
  const [dayUnits, setDayUnits] = useState<DayUnits>({});
  const [savingCards, setSavingCards] = useState<Record<string, boolean>>({});
  const [defaultUnit, setDefaultUnit] = useState<string>(DEFAULT_UNIT);
  const [showDefaultUnitSelector, setShowDefaultUnitSelector] = useState<boolean>(false);
  const [isApplyingDefaultUnit, setIsApplyingDefaultUnit] = useState<boolean>(false);

  // Valores memoizados
  const dates = useMemo(() => generateDates(DAYS_TO_SHOW), []);
  const todayString = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Função para verificar se a data está próxima
  const isDateNear = useCallback((dateString: string): boolean => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + NEAR_DATE_THRESHOLD);
    return new Date(dateString + "T00:00:00") <= targetDate;
  }, []);

  // Contar cards sem unidade definida
  const cardsWithoutUnit = useMemo(() => {
    return dates.filter((date) => {
      const unit = dayUnits[date];
      return !unit || unit === "DIRAD";
    });
  }, [dates, dayUnits]);

  // Carregar previsões existentes - otimizado para carregamento inicial
  const loadExistingPrevisoes = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Query otimizada com índices específicos
      const { data: previsoes, error: supabaseError } = await supabase
        .from("rancho_previsoes")
        .select("data, unidade, refeicao, vai_comer")
        .eq("user_id", user.id)
        .gte("data", dates[0])
        .lte("data", dates[dates.length - 1])
        .order("data", { ascending: true });

      if (supabaseError) throw supabaseError;

      // Inicialização otimizada usando Object.fromEntries
      const initialSelections = Object.fromEntries(
        dates.map(date => [date, createEmptyDayMeals()])
      );
      
      const initialUnits = Object.fromEntries(
        dates.map(date => [date, defaultUnit])
      );

      // Aplicar previsões existentes de forma otimizada
      if (previsoes && previsoes.length > 0) {
        previsoes.forEach((previsao) => {
          if (initialSelections[previsao.data]) {
            initialSelections[previsao.data][previsao.refeicao as MealType] = previsao.vai_comer;
            initialUnits[previsao.data] = previsao.unidade;
          }
        });
      }

      setSelections(initialSelections);
      setDayUnits(initialUnits);
      setError("");
    } catch (err) {
      console.error("Erro ao carregar previsões:", err);
      setError("Erro ao carregar previsões existentes. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, dates, defaultUnit]);

  // Carregar dados quando componente montar
  useEffect(() => {
    if (user?.id) {
      loadExistingPrevisoes();
    }
  }, [user?.id, loadExistingPrevisoes]);

  // Auto-save otimizado com debounce
  useEffect(() => {
    if (pendingChanges.length === 0) return;

    const timer = setTimeout(() => {
      savePendingChanges();
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timer);
  }, [pendingChanges]);

  // Aplicar unidade padrão otimizado
  const applyDefaultUnitToAll = useCallback(async () => {
    if (!user?.id || cardsWithoutUnit.length === 0) return;

    setIsApplyingDefaultUnit(true);

    try {
      // Atualizar unidades localmente
      const updatedUnits = { ...dayUnits };
      cardsWithoutUnit.forEach((date) => {
        updatedUnits[date] = defaultUnit;
      });
      setDayUnits(updatedUnits);

      // Criar mudanças pendentes para refeições selecionadas
      const newPendingChanges: PendingChange[] = [];
      cardsWithoutUnit.forEach((date) => {
        const dayMeals = selections[date];
        if (dayMeals) {
          Object.entries(dayMeals)
            .filter(([_, isSelected]) => isSelected)
            .forEach(([meal, value]) => {
              newPendingChanges.push({
                date,
                meal: meal as MealType,
                value,
                unidade: defaultUnit,
              });
            });
        }
      });

      if (newPendingChanges.length > 0) {
        setPendingChanges((prev) => {
          const filtered = prev.filter(
            (change) => !cardsWithoutUnit.includes(change.date)
          );
          return [...filtered, ...newPendingChanges];
        });
      }

      setSuccess(`Unidade padrão "${defaultUnit}" aplicada a ${cardsWithoutUnit.length} card(s)!`);
      setShowDefaultUnitSelector(false);
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Erro ao aplicar unidade padrão:", err);
      setError("Erro ao aplicar unidade padrão. Tente novamente.");
    } finally {
      setIsApplyingDefaultUnit(false);
    }
  }, [user?.id, cardsWithoutUnit, dayUnits, defaultUnit, selections]);

  // Salvar mudanças pendentes otimizado
  const savePendingChanges = useCallback(async () => {
    if (!user?.id || pendingChanges.length === 0) return;

    setIsSavingBatch(true);

    try {
      // Agrupar mudanças por data para otimizar operações
      const changesByDate = pendingChanges.reduce((acc, change) => {
        if (!acc[change.date]) {
          acc[change.date] = [];
        }
        acc[change.date].push(change);
        return acc;
      }, {} as Record<string, PendingChange[]>);

      let successCount = 0;
      let errorCount = 0;

      // Processar cada data separadamente
      for (const [date, dateChanges] of Object.entries(changesByDate)) {
        try {
          // 1. Primeiro, deletar TODOS os registros existentes para esta data
          const { error: deleteError } = await supabase
            .from("rancho_previsoes")
            .delete()
            .eq("user_id", user.id)
            .eq("data", date);

          if (deleteError) {
            console.error("Erro ao deletar registros existentes:", deleteError);
            errorCount += dateChanges.length;
            continue;
          }

          // 2. Depois, inserir apenas os registros com vai_comer = true
          const recordsToInsert = dateChanges
            .filter(change => change.value === true)
            .map(change => ({
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

            if (insertError) {
              console.error("Erro ao inserir novos registros:", insertError);
              errorCount += dateChanges.length;
              continue;
            }
          }

          successCount += dateChanges.length;
        } catch (err) {
          console.error(`Erro ao processar data ${date}:`, err);
          errorCount += dateChanges.length;
        }
      }

      if (errorCount === 0) {
        setSuccess(`${pendingChanges.length} alteração(ões) salva(s) com sucesso!`);
        setPendingChanges([]);
      } else if (successCount > 0) {
        setSuccess(`${successCount} alteração(ões) salva(s). ${errorCount} falharam.`);
        // Remover apenas as mudanças que foram salvas com sucesso
        setPendingChanges(prev => 
          prev.filter(change => 
            !Object.keys(changesByDate).some(date => 
              changesByDate[date].some(c => 
                c.date === change.date && 
                c.meal === change.meal && 
                c.unidade === change.unidade
              )
            )
          )
        );
      } else {
        throw new Error(`Todas as ${errorCount} operação(ões) falharam`);
      }

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Erro ao salvar mudanças:", err);
      setError("Erro ao salvar alterações. Tente novamente.");
    } finally {
      setIsSavingBatch(false);
    }
  }, [user?.id, pendingChanges]);

  // Toggle de refeição otimizado
  const handleMealToggle = useCallback((date: string, meal: MealType) => {
    if (!user?.id || isDateNear(date)) return;

    const currentValue = selections[date]?.[meal] || false;
    const newValue = !currentValue;
    const unidade = dayUnits[date] || defaultUnit;

    // Atualizar estado local imediatamente
    setSelections((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [meal]: newValue,
      },
    }));

    // Adicionar à lista de mudanças pendentes
    setPendingChanges((prev) => {
      const filtered = prev.filter(
        (change) => !(change.date === date && change.meal === meal)
      );
      return [...filtered, { date, meal, value: newValue, unidade }];
    });
  }, [user?.id, selections, dayUnits, defaultUnit, isDateNear]);

  // Alterar unidade do dia otimizado
  const handleUnitChange = useCallback((date: string, newUnit: string) => {
    if (!user?.id || isDateNear(date)) return;

    setDayUnits((prev) => ({
      ...prev,
      [date]: newUnit,
    }));

    const dayMeals = selections[date];
    if (dayMeals) {
      const newPendingChanges = Object.entries(dayMeals)
        .filter(([_, isSelected]) => isSelected)
        .map(([meal, value]) => ({
          date,
          meal: meal as MealType,
          value,
          unidade: newUnit,
        }));

      setPendingChanges((prev) => {
        const filtered = prev.filter((change) => change.date !== date);
        return [...filtered, ...newPendingChanges];
      });
    }
  }, [user?.id, selections, isDateNear]);

  // Formatação de data memoizada
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);

  // Dia da semana memoizado
  const getDayOfWeek = useCallback((dateString: string): string => {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("pt-BR", { weekday: "long" });
  }, []);

  // Contar refeições selecionadas por dia
  const getSelectedMealsCount = useCallback((date: string): number => {
    const daySelections = selections[date];
    if (!daySelections) return 0;
    return Object.values(daySelections).filter(Boolean).length;
  }, [selections]);

  // Limpar mensagens
  const clearMessages = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          {cardsWithoutUnit.length > 0 && (
            <Button
            
              variant="outline"
              size="sm"
              onClick={() => setShowDefaultUnitSelector(!showDefaultUnitSelector)}
              className="text-orange-600 border-orange-600 hover:bg-orange-50 cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-2" />
              Unidade Padrão ({cardsWithoutUnit.length})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadExistingPrevisoes}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Seletor de Unidade Padrão */}
      {showDefaultUnitSelector && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <Settings className="h-5 w-5" />
              <span>Configurar Unidade Padrão</span>
            </CardTitle>
            <CardDescription className="text-orange-700">
              Defina uma unidade padrão para os {cardsWithoutUnit.length} card(s) que ainda não possuem unidade definida no banco de dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-orange-800">
                Selecione a unidade padrão:
              </Label>
              <Select value={defaultUnit} onValueChange={setDefaultUnit}>
                <SelectTrigger className="w-full cursor-pointer border-orange-200 focus:border-orange-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES_DISPONIVEIS.map((unidade) => (
                    <SelectItem className="cursor-pointer" key={unidade.value} value={unidade.value}>
                      {unidade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-orange-200">
              <div className="text-sm text-orange-700">
                Esta ação aplicará a unidade "{defaultUnit}" a todos os cards sem unidade definida.
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDefaultUnitSelector(false)}
                  className="border-orange-200 text-orange-700 hover:bg-orange-100 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={applyDefaultUnitToAll}
                  disabled={isApplyingDefaultUnit || cardsWithoutUnit.length === 0}
                  className="bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                >
                  {isApplyingDefaultUnit ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Aplicar a {cardsWithoutUnit.length} card(s)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="ghost" size="sm" onClick={clearMessages} className="cursor-pointer">
              ✕
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Estatísticas Militares */}
      <MilitaryStats selections={selections} dayUnits={dayUnits} dates={dates} />

      {/* Status de salvamento */}
      {pendingChanges.length > 0 && (
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isSavingBatch ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                  <span className="text-sm text-orange-700">Salvando alterações...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-orange-700">
                    {pendingChanges.length} alteração(ões) pendente(s) - salvamento automático em andamento
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cards Container */}
      <div className="overflow-x-auto pb-4">
        <div className="flex space-x-4 min-w-max">
          {dates.map((date) => {
            const daySelections = selections[date] || createEmptyDayMeals();
            const dayUnit = dayUnits[date] || defaultUnit;

            return (
              <DayCard
                key={date}
                date={date}
                daySelections={daySelections}
                dayUnit={dayUnit}
                defaultUnit={defaultUnit}
                onMealToggle={handleMealToggle}
                onUnitChange={handleUnitChange}
                formatDate={formatDate}
                getDayOfWeek={getDayOfWeek}
                getSelectedMealsCount={getSelectedMealsCount}
                isDateNear={isDateNear}
                todayString={todayString}
                pendingChanges={pendingChanges}
                savingCards={savingCards}
              />
            );
          })}
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