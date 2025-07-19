import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import type { Route } from "./+types/rancho";

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
  [key: string]: boolean; // cafe, almoco, janta, ceia
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Previsão" },
    { name: "description", content: "Faça sua previsão" },
  ];
}

export default function Rancho() {
  const { user } = useAuth();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [unidade, setUnidade] = useState("DIRAD");

  const [selections, setSelections] = useState<{ [date: string]: DayMeals }>(
    {}
  );

  const [savingCards, setSavingCards] = useState<{ [date: string]: boolean }>(
    {}
  );

  const mealTypes = [
    {
      value: "cafe",
      label: "Café",
      icon: Coffee,
      color: "bg-orange-100 text-orange-800",
    },
    {
      value: "almoco",
      label: "Almoço",
      icon: Utensils,
      color: "bg-green-100 text-green-800",
    },
    {
      value: "janta",
      label: "Jantar",
      icon: Moon,
      color: "bg-blue-100 text-blue-800",
    },
    {
      value: "ceia",
      label: "Ceia",
      icon: Sun,
      color: "bg-purple-100 text-purple-800",
    },
  ] as const;

  const generateNext30Days = () => {
    const days = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date.toISOString().split("T")[0]);
    }

    return days;
  };

  const [dates] = useState(generateNext30Days());

  useEffect(() => {
    if (user) {
      loadExistingPrevisoes();
    }
  }, [user]);

  const loadExistingPrevisoes = async () => {
    if (!user) return;

    try {
      const { data: previsoes, error: supabaseError } = await supabase
        .from("rancho_previsoes")
        .select("*")
        .eq("user_id", user.id)
        .eq("unidade", unidade)
        .gte("data", dates[0])
        .lte("data", dates[dates.length - 1]);

      if (supabaseError) throw supabaseError;

      const organizedSelections: { [date: string]: DayMeals } = {};

      previsoes?.forEach((previsao) => {
        if (!organizedSelections[previsao.data]) {
          organizedSelections[previsao.data] = {
            cafe: false,
            almoco: false,
            janta: false,
            ceia: false,
          };
        }
        organizedSelections[previsao.data][previsao.refeicao] =
          previsao.vai_comer;
      });

      setSelections(organizedSelections);
    } catch (err: any) {
      console.error("Erro ao carregar previsões:", err);
      setError("Erro ao carregar previsões existentes");
    }
  };

  const handleMealToggle = async (date: string, meal: MealType) => {
    if (!user) return;

    const currentValue = selections[date]?.[meal] || false;
    const newValue = !currentValue;

    setSelections((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [meal]: newValue,
      },
    }));

    setSavingCards((prev) => ({ ...prev, [date]: true }));

    try {
      const previsao: Omit<RanchoPrevisao, "id" | "created_at"> = {
        data: date,
        unidade,
        user_id: user.id,
        refeicao: meal,
        vai_comer: newValue,
      };

      const { data: existing } = await supabase
        .from("rancho_previsoes")
        .select("id")
        .eq("user_id", user.id)
        .eq("data", date)
        .eq("unidade", unidade)
        .eq("refeicao", meal)
        .single();

      if (existing) {
        const { error: updateError } = await supabase
          .from("rancho_previsoes")
          .update({ vai_comer: newValue })
          .eq("id", existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("rancho_previsoes")
          .insert([previsao]);

        if (insertError) throw insertError;
      }

      setSuccess(
        `${meal.charAt(0).toUpperCase() + meal.slice(1)} ${
          newValue ? "adicionado" : "removido"
        } para ${formatDate(date)}`
      );
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      console.error("Erro ao salvar previsão:", err);
      setError(err.message || "Erro ao salvar previsão");

      setSelections((prev) => ({
        ...prev,
        [date]: {
          ...prev[date],
          [meal]: currentValue,
        },
      }));
    } finally {
      setSavingCards((prev) => ({ ...prev, [date]: false }));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("pt-BR", { weekday: "long" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {window.innerWidth >= 640 ? (
            <Building2 className="h-8 w-8 text-blue-600" />
          ) : null}

          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rancho</h1>
            {window.innerWidth >= 640 ? (
              <p className="text-gray-600">
                Selecione as refeições que você irá consumir
              </p>
            ) : null}
          </div>
        </div>

        {/* Seletor de Unidade */}
        <div className="flex items-center space-x-2">
          <Label htmlFor="unidade" className="text-sm font-medium">
            Unidade:
          </Label>
          <Input
            id="unidade"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            className="w-32"
            placeholder="Ex: DIRAD"
          />
        </div>
      </div>

      {/* Unidade Display */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2">
          {/* <Building2 className="h-5 w-5 text-blue-600" /> */}
          <span className="text-lg font-semibold text-blue-900">{unidade}</span>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Cards Container */}
      <div className="overflow-x-auto p-4">
        <div className="flex space-x-4 min-w-max">
          {dates.map((date) => {
            const daySelections = selections[date] || {
              cafe: false,
              almoco: false,
              janta: false,
              ceia: false,
            };

            const isSaving = savingCards[date];

            const todayString = new Date().toISOString().split("T")[0];

            const isToday = date === todayString;

            console.log("isToday", isToday, date, todayString);

            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 3);

            const isNear = new Date(date + "T00:00:00") <= targetDate;

            return (
              <Card
                key={date}
                className={`w-80 flex-shrink-0 ${
                  isNear && !isToday ? "ring-2 ring-grey-500 bg-grey-50" : ""
                } ${isToday ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>{formatDate(date)}</span>
                      {isToday && <Badge variant="secondary">Hoje</Badge>}
                    </div>
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isNear && <LockKeyhole className="h-4 w-4 text-gray-500" />}
                  </CardTitle>
                  <CardDescription className="capitalize">
                    {getDayOfWeek(date)}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {mealTypes.map((meal) => {
                    const Icon = meal.icon;
                    const isSelected = daySelections[meal.value];

                    return (
                      <button
                        key={meal.value}
                        onClick={() => handleMealToggle(date, meal.value)}
                        disabled={isSaving || isNear}
                        className={`
                          w-full p-3 rounded-lg border-2 transition-all duration-200
                          ${
                            isSelected
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }
                          ${
                            isSaving
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer hover:shadow-sm"
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Icon
                              className={`h-5 w-5 ${
                                isSelected ? "text-green-600" : "text-gray-500"
                              }`}
                            />
                            <span
                              className={`font-medium ${
                                isSelected ? "text-green-900" : "text-gray-700"
                              }`}
                            >
                              {meal.label}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {isSelected && (
                              <Badge className="bg-green-100 text-green-800">
                                ✓ Sim
                              </Badge>
                            )}
                            {!isSelected && (
                              <Badge
                                variant="outline"
                                className="text-gray-600"
                              >
                                ✗ Não
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
