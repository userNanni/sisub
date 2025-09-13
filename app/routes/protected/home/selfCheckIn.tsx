// routes/protected/presence/selfCheckin.tsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import supabase from "@/utils/supabase";
import { toast } from "sonner";
import type { MealKey, DialogState } from "~/utils/FiscalUtils";
import FiscalDialog from "~/components/presence/FiscalDialog";
import { Button } from "@/components/ui/button";

// Mesmas regras usadas no presence
function inferDefaultMeal(now: Date = new Date()): MealKey {
  const toMin = (h: number, m = 0) => h * 60 + m;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const inRange = (start: number, end: number) =>
    minutes >= start && minutes < end;

  if (inRange(toMin(4), toMin(9))) return "cafe";
  if (inRange(toMin(9), toMin(15))) return "almoco";
  if (inRange(toMin(15), toMin(20))) return "janta";
  return "ceia";
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// Monta o redirectTo com base na URL atual e faz sanitização simples
function buildRedirectTo(
  pathname: string,
  search: string,
  fallback = "/rancho"
) {
  const raw = `${pathname}${search || ""}`;
  // Aceita apenas caminhos internos que iniciam com "/" e não com "//"
  const safe = raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
  return encodeURIComponent(safe);
}

export default function SelfCheckin() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectedRef = useRef(false); // evita múltiplos navigates em strict mode

  // ÚNICO parâmetro esperado no QR: unidade
  const unitParam = search.get("unit") ?? search.get("u");
  const unidade = useMemo(() => unitParam ?? "DIRAD - DIRAD", [unitParam]);

  // Autoinferência de data e refeição (mesmas regras do presence)
  const date = useMemo(() => todayISO(), []);
  const meal = useMemo<MealKey>(() => inferDefaultMeal(), []);

  // Estado do diálogo (igual ao usado na página de presence/fiscal)
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    uuid: null,
    systemForecast: null,
    willEnter: "sim",
  });

  // Autenticação + preparação do diálogo (sem auto-insert)
  useEffect(() => {
    let cancelled = false;
    console.log("Iniciando check-in:", { date, meal, unidade });
    const run = async () => {
      // 1) Verifica usuário autenticado
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        if (!redirectedRef.current) {
          redirectedRef.current = true;
          const redirectTo = buildRedirectTo(
            location.pathname,
            location.search
          );
          navigate(`/login?redirectTo=${redirectTo}`, { replace: true });
        }
        return;
      }

      const userId = authData.user.id;
      console.log(userId);

      // 2) Valida unidade mínima
      if (!unidade) {
        toast.error("QR inválido", {
          description: "A unidade não foi informada.",
        });
        return;
      }

      // 3) Busca previsão do sistema para exibir no diálogo
      try {
        const { data: previsao } = await supabase
          .from("rancho_previsoes")
          .select("vai_comer")
          .eq("user_id", userId)
          .eq("data", date)
          .eq("refeicao", meal)
          .eq("unidade", unidade)
          .maybeSingle();

        if (!cancelled) {
          setDialog({
            open: true, // Abre o diálogo — sem auto-insert
            uuid: userId,
            systemForecast: previsao ? !!previsao.vai_comer : null,
            willEnter: "sim",
          });
        }
      } catch (err) {
        console.error("Erro ao preparar diálogo:", err);
        toast.error("Erro", { description: "Falha ao carregar informações." });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // location.pathname/search entram para garantir que o redirectTo reflita a URL atual
  }, [date, meal, unidade, navigate, location.pathname, location.search]);

  // Confirmação via diálogo (só insere se willEnter = "sim")
  const handleConfirmDialog = useCallback(async () => {
    if (!dialog.uuid) return;

    try {
      if (dialog.willEnter === "sim") {
        const { error } = await supabase.from("rancho_presencas").insert({
          user_id: dialog.uuid,
          date,
          meal,
          unidade,
        });

        if (error) {
          if ((error as any).code === "23505") {
            toast.info("Já registrado", {
              description:
                "Sua presença já está registrada para esta refeição.",
            });
          } else {
            console.error("Erro ao registrar presença:", error);
            toast.error("Erro", {
              description: "Não foi possível registrar sua presença.",
            });
            return;
          }
        } else {
          toast.success("Presença registrada", { description: "Bom apetite!" });
        }
      } else {
        toast.info("Decisão registrada", {
          description: "Você optou por não entrar para a refeição.",
        });
      }
    } finally {
      // Fecha o diálogo após a ação
      setDialog((d) => ({ ...d, open: false, uuid: null }));
    }
  }, [dialog.uuid, dialog.willEnter, date, meal, unidade]);

  const goHome = () => navigate("/rancho");
  const reopenDialog = () =>
    setDialog((d) => (d.uuid ? { ...d, open: true } : d));

  return (
    <div className="max-w-md mx-auto p-6 text-center space-y-4">
      <h1 className="text-xl font-semibold">Check-in de Refeição</h1>
      <p className="text-sm text-muted-foreground">
        Unidade: <b>{unidade}</b> • Data: <b>{date}</b> • Refeição:{" "}
        <b>{meal}</b>
      </p>

      <div className="flex items-center justify-center gap-3">
        <Button onClick={reopenDialog} disabled={!dialog.uuid}>
          Fazer check-in
        </Button>
        <Button variant="outline" onClick={goHome}>
          Voltar
        </Button>
      </div>

      <FiscalDialog
        setDialog={setDialog}
        dialog={dialog}
        confirmDialog={handleConfirmDialog}
        selectedUnit={unidade}
      />
    </div>
  );
}
