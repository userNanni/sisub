import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import QrScanner from "qr-scanner";
import supabase from "@/utils/supabase";

// UI & Icons
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Trash2 } from "lucide-react";

import { toast } from "sonner";

import Filters from "~/components/filters";
import {
  MealKey,
  MEAL_LABEL,
  DialogState,
  generateRestrictedDates,
  PresenceRecord,
} from "~/utils/FiscalUtils";
import FiscalDialog from "~/components/FiscalDialog";
import PresenceTable from "~/components/PresenceTable";

interface ScannerState {
  isReady: boolean;
  isScanning: boolean;
  hasPermission: boolean;
  error?: string;
}

export function meta() {
  return [
    { title: "Fiscalização - Leitor de QR" },
    {
      name: "description",
      content: "Fiscalize a refeição escaneando o QR do militar",
    },
  ];
}

export default function Qr(): JSX.Element {
  const scannerRef = useRef<QrScanner | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrBoxRef = useRef<HTMLDivElement>(null);

  const [scannerState, setScannerState] = useState<ScannerState>({
    isReady: false,
    isScanning: false,
    hasPermission: true,
  });
  const dates = useMemo(() => generateRestrictedDates(), []);

  const [lastScanResult, setLastScanResult] = useState<string>("");

  const [selectedDate, setSelectedDate] = useState<string>(dates[1]);
  const [selectedMeal, setSelectedMeal] = useState<MealKey>("almoco");
  const [selectedUnit, setSelectedUnit] = useState<string>("DIRAD - DIRAD");

  const currentFiltersRef = useRef({
    selectedDate,
    selectedMeal,
    selectedUnit,
  });

  const [presences, setPresences] = useState<PresenceRecord[]>([]);

  const [forecastMap, setForecastMap] = useState<Record<string, boolean>>({});

  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    uuid: null,
    systemForecast: null,
    willEnter: "sim",
  });

  // Iniciar scanner
  useEffect(() => {
    let isCancelled = false;

    const startScanner = async () => {
      if (!videoRef.current || scannerRef.current) return;

      try {
        const hasPermission = await navigator.mediaDevices
          .getUserMedia({ video: { facingMode: { ideal: "environment" } } })
          .then((stream) => {
            stream.getTracks().forEach((t) => t.stop());
            return true;
          })
          .catch(() => false);

        if (!hasPermission) {
          if (!isCancelled) {
            setScannerState((s) => ({
              ...s,
              hasPermission: false,
              isReady: true,
            }));
          }
          return;
        }

        scannerRef.current = new QrScanner(
          videoRef.current,
          (result) => {
            onScanSuccess(result);
          },
          {
            onDecodeError: onScanFail,
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            overlay: qrBoxRef.current ?? undefined,
          }
        );

        await scannerRef.current.start();
        if (!isCancelled) {
          setScannerState({
            isReady: true,
            isScanning: true,
            hasPermission: true,
          });
        }
      } catch (err: any) {
        console.error("Erro ao iniciar o scanner:", err);
        if (!isCancelled) {
          setScannerState({
            isReady: true,
            isScanning: false,
            hasPermission: false,
            error: String(err?.message ?? err),
          });
        }
      }
    };

    startScanner();

    return () => {
      isCancelled = true;
      scannerRef.current?.stop();
      scannerRef.current?.destroy?.();
      scannerRef.current = null;
    };
  }, []);

  useEffect(() => {
    currentFiltersRef.current = { selectedDate, selectedMeal, selectedUnit };

    const loadPresence = async () => {
      const { data, error } = await supabase
        .from("rancho_presencas")
        .select("id, user_id, date, meal, unidade, created_at")
        .eq("date", selectedDate)
        .eq("refeicao", selectedMeal)
        .eq("unidade", selectedUnit)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar presenças:", error);
        toast.error("Erro", {
          description: "Não foi possível carregar as presenças.",
        });
        return;
      }
      const rows = data || [];
      setPresences(rows);

      if (rows.length > 0) {
        const userIds = Array.from(new Set(rows.map((p) => p.user_id)));
        const { data: previsoes, error: prevErr } = await supabase
          .from("rancho_previsoes")
          .select("user_id, vai_comer")
          .eq("data", selectedDate)
          .eq("refeicao", selectedMeal)
          .eq("unidade", selectedUnit)
          .in("user_id", userIds);

        if (prevErr) {
          console.warn("Falha ao buscar previsões:", prevErr);
          setForecastMap({});
        } else {
          const map: Record<string, boolean> = {};
          for (const r of previsoes ?? []) {
            map[r.user_id] = !!r.vai_comer;
          }
          setForecastMap(map);
        }
      } else {
        setForecastMap({});
      }
    };

    loadPresence();
  }, [selectedDate, selectedMeal, selectedUnit]);

  const onScanSuccess = async (result: QrScanner.ScanResult) => {
    const uuid = (result?.data || "").trim();
    if (!uuid) return;

    const {
      selectedDate: currentDate,
      selectedMeal: currentMeal,
      selectedUnit: currentUnit,
    } = currentFiltersRef.current;

    setLastScanResult(uuid);

    try {
      const { data: previsao, error: prevError } = await supabase
        .from("rancho_previsoes")
        .select("vai_comer")
        .eq("user_id", uuid)
        .eq("data", currentDate)
        .eq("refeicao", currentMeal)
        .eq("unidade", currentUnit)
        .maybeSingle();

      if (prevError) throw prevError;
      console.log("Previsão:", previsao);
      setDialog({
        open: true,
        uuid,
        systemForecast: previsao ? !!previsao.vai_comer : null,
        willEnter: "sim",
      });
    } catch (err) {
      console.error("Erro ao preparar diálogo:", err);
      toast.error("Erro", { description: "Falha ao processar QR." });
    }
  };

  const onScanFail = (err: string | Error) => {
    console.warn("QR Error:", err);
  };

  const confirmDialog = async () => {
    const uuid = dialog.uuid;
    if (!uuid) return;

    const willEnter = dialog.willEnter === "sim";

    try {
      if (!willEnter) {
        toast.info("Registro atualizado", {
          description:
            "Decisão registrada. Militar não entrará para a refeição.",
        });
        setDialog((d) => ({ ...d, open: false }));
        return;
      }

      if (!selectedUnit) {
        toast.error("Selecione a OM", {
          description: "É necessário informar a unidade.",
        });
        setDialog((d) => ({ ...d, open: false }));
        return;
      }
      const { data: inserted, error: insError } = await supabase
        .from("rancho_presencas")
        .insert({
          user_id: uuid,
          date: selectedDate,
          meal: selectedMeal,
          unidade: selectedUnit,
        })
        .select();

      if (insError) {
        if ((insError as any).code === "23505") {
          toast.info("Já registrado", {
            description: "Este militar já foi marcado presente.",
          });
        } else {
          throw insError;
        }
      } else {
        const newRow = inserted?.[0] as PresenceRecord | undefined;
        if (newRow) {
          setPresences((prev) => [newRow, ...prev]);

          toast.success("Presença registrada", {
            description: `UUID ${uuid} marcado.`,
          });
        }
      }
    } catch (err) {
      console.error("Erro ao confirmar diálogo:", err);
      toast.error("Erro", { description: "Falha ao salvar decisão." });
    } finally {
      setDialog((d) => ({ ...d, open: false }));
    }
  };

  const actions = useMemo(
    () => ({
      toggleScan: async () => {
        if (!scannerRef.current) return;
        try {
          if (scannerState.isScanning) {
            await scannerRef.current.stop();
            setScannerState((s) => ({ ...s, isScanning: false }));
          } else {
            await scannerRef.current.start();
            setScannerState((s) => ({ ...s, isScanning: true }));
          }
        } catch (err) {
          console.error("Erro ao alternar scanner:", err);
        }
      },
      refresh: async () => {
        try {
          await scannerRef.current?.stop();
        } catch {}
        try {
          await scannerRef.current?.start();
          setScannerState((s) => ({ ...s, isScanning: true, isReady: true }));
        } catch (err) {
          console.error("Erro ao atualizar scanner:", err);
        }
      },
      clearResult: () => setLastScanResult(""),
      removePresence: async (row: PresenceRecord) => {
        const { error } = await supabase
          .from("rancho_presencas")
          .delete()
          .match({
            id: row.id,
            date: row.date,
            meal: row.meal,
            user_id: row.user_id,
          });

        if (error) {
          toast.error("Erro", { description: "Não foi possível excluir." });
          return;
        }
        setPresences((prev) => prev.filter((p) => p.id !== row.id));
        toast.success("Excluído", { description: "Registro removido." });
      },
    }),
    [scannerState.isScanning]
  );

  return (
    <div className="space-y-6">
      {/* Filtros de fiscalização */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <Filters
          selectedDate={selectedDate}
          setSelectedDate={(v) => setSelectedDate(v)}
          selectedMeal={selectedMeal}
          setSelectedMeal={(v) => setSelectedMeal(v)}
          selectedUnit={selectedUnit}
          setSelectedUnit={(v) => setSelectedUnit(v)}
          dates={dates}
        />
        {/* Ações do scanner */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={actions.toggleScan}>
            <Camera className="h-4 w-4 mr-2" />
            {scannerState.isScanning ? "Pausar" : "Iniciar"}
          </Button>
          <Button variant="outline" size="sm" onClick={actions.refresh}>
            <RefreshCw
              className={`h-4 w-4 ${scannerState.isScanning ? "animate-spin" : ""}`}
            />
          </Button>
          {lastScanResult && (
            <Button variant="secondary" size="sm" onClick={actions.clearResult}>
              Limpar último
            </Button>
          )}
        </div>
      </div>

      {/* Leitor de QR */}
      <div className="qr-reader relative">
        <video
          ref={videoRef}
          className="rounded-md w-full max-h-[60vh] object-cover"
        />
        <div ref={qrBoxRef} className="qr-box pointer-events-none" />
        {lastScanResult && (
          <p className="absolute top-2 left-2 z-50 text-white bg-black/60 rounded px-2 py-1">
            Último UUID: {lastScanResult}
          </p>
        )}
      </div>
      <PresenceTable
        selectedDate={selectedDate}
        selectedMeal={selectedMeal}
        presences={presences}
        forecastMap={forecastMap}
        actions={actions}
      />
      <FiscalDialog
        setDialog={(v) => setDialog(v)}
        dialog={dialog}
        confirmDialog={() => confirmDialog()}
        selectedUnit={selectedUnit}
      />
    </div>
  );
}
