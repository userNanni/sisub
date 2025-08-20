import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import QrScanner from "qr-scanner";
import supabase from "@/utils/supabase";

// UI & Icons
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import Filters from "~/components/filters";
import {
  MealKey,
  DialogState,
  generateRestrictedDates,
} from "~/utils/FiscalUtils";
import FiscalDialog from "~/components/FiscalDialog";
import PresenceTable from "~/components/PresenceTable";
import { usePresenceManagement } from "~/components/hooks/usePresenceManagement"; // Importe o novo hook
import { Checkbox } from "~/components/ui/checkbox";

interface ScannerState {
  isReady: boolean;
  isScanning: boolean;
  hasPermission: boolean;
  error?: string;
}

interface FiscalFilters {
  date: string;
  meal: MealKey;
  unit: string;
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

export default function Qr() {
  const scannerRef = useRef<QrScanner | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrBoxRef = useRef<HTMLDivElement>(null);
  const [autoCloseDialog, setAutoCloseDialog] = useState(true);

  const [scannerState, setScannerState] = useState<ScannerState>({
    isReady: false,
    isScanning: false,
    hasPermission: true,
  });
  const dates = useMemo(() => generateRestrictedDates(), []);
  const [lastScanResult, setLastScanResult] = useState<string>("");

  const [filters, setFilters] = useState<FiscalFilters>({
    date: dates[1],
    meal: "almoco",
    unit: "DIRAD - DIRAD",
  });

  const currentFiltersRef = useRef(filters);
  useEffect(() => {
    currentFiltersRef.current = filters;
  }, [filters]);

  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    uuid: null,
    systemForecast: null,
    willEnter: "sim",
  });

  // Lógica de dados agora vem do hook, que é alimentado pelos filtros
  const { presences, forecastMap, confirmPresence, removePresence } =
    usePresenceManagement(filters);

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

  const onScanSuccess = async (result: QrScanner.ScanResult) => {
    const uuid = (result?.data || "").trim();
    if (!uuid) return;

    const {
      date: currentDate,
      meal: currentMeal,
      unit: currentUnit,
    } = currentFiltersRef.current;
    setLastScanResult(uuid);

    try {
      const { data: previsao } = await supabase
        .from("rancho_previsoes")
        .select("vai_comer")
        .eq("user_id", uuid)
        .eq("data", currentDate)
        .eq("refeicao", currentMeal)
        .eq("unidade", currentUnit)
        .maybeSingle();

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

  // Função "orquestradora" que usa a lógica do hook
  const handleConfirmDialog = async () => {
    if (!dialog.uuid) return;

    try {
      await confirmPresence(dialog.uuid, dialog.willEnter === "sim");
    } catch (err) {
      console.error("Falha ao confirmar presença:", err);
      // O hook já exibe um toast de erro, não precisa de outro aqui
    } finally {
      setDialog((d) => ({ ...d, open: false }));
    }
  };
  const toggleScan = useCallback(async () => {
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
  }, [scannerState.isScanning]);

  const refresh = useCallback(async () => {
    try {
      await scannerRef.current?.stop();
    } catch {}
    try {
      await scannerRef.current?.start();
      setScannerState((s) => ({ ...s, isScanning: true, isReady: true }));
    } catch (err) {
      console.error("Erro ao atualizar scanner:", err);
    }
  }, []);

  useEffect(() => {
    // Se o diálogo não está aberto ou a opção está desligada, não faz nada.
    if (!dialog.open || !autoCloseDialog) return;

    // Define um timer para fechar o diálogo após 3 segundos (3000 ms)
    const timerId = setTimeout(() => {
      handleConfirmDialog();
      setDialog((d) => ({ ...d, open: false }));
    }, 3000);

    // Função de limpeza: será executada se o diálogo for fechado antes do tempo
    // ou se o componente for desmontado.
    return () => {
      clearTimeout(timerId);
    };
  }, [dialog.open, autoCloseDialog]);

  const clearResult = useCallback(() => setLastScanResult(""), []);

  const actions = useMemo(
    () => ({
      toggleScan,
      refresh,
      clearResult,
      removePresence,
    }),
    [toggleScan, refresh, clearResult, removePresence]
  );

  return (
    <div className="space-y-6">
      {/* Filtros de fiscalização */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <Filters
          // Passa o objeto de filtros e as funções de atualização
          selectedDate={filters.date}
          setSelectedDate={(v) => setFilters((f) => ({ ...f, date: v }))}
          selectedMeal={filters.meal}
          setSelectedMeal={(v) => setFilters((f) => ({ ...f, meal: v }))}
          selectedUnit={filters.unit}
          setSelectedUnit={(v) => setFilters((f) => ({ ...f, unit: v }))}
          dates={dates}
        />
        <div className="flex items-center space-x-2">
          <Checkbox
            id="autoClose"
            checked={autoCloseDialog}
            onCheckedChange={(v) => setAutoCloseDialog(v)}
          />
          <label
            htmlFor="autoClose"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Fechar auto.
          </label>
        </div>
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
        selectedDate={filters.date}
        selectedMeal={filters.meal}
        presences={presences}
        forecastMap={forecastMap}
        actions={actions}
      />
      <FiscalDialog
        setDialog={(v) => setDialog(v)}
        dialog={dialog}
        confirmDialog={handleConfirmDialog}
        selectedUnit={filters.unit}
      />
    </div>
  );
}
