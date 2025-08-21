import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useReducer, // Importação correta do useReducer
} from "react";
import QrScanner from "qr-scanner";
import supabase from "@/utils/supabase";

// UI & Icons
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import Filters from "~/components/Filters";
import {
  MealKey,
  DialogState,
  generateRestrictedDates,
} from "~/utils/FiscalUtils";
import FiscalDialog from "~/components/FiscalDialog";
import PresenceTable from "~/components/PresenceTable";
import { usePresenceManagement } from "~/components/hooks/usePresenceManagement";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";

// Tipos de estado e ação para o scanner
interface ScannerState {
  isReady: boolean;
  isScanning: boolean;
  hasPermission: boolean;
  error?: string;
}

type ScannerAction =
  | { type: "INITIALIZE_SUCCESS"; hasPermission: boolean }
  | { type: "INITIALIZE_ERROR"; error: string }
  | { type: "TOGGLE_SCAN"; isScanning: boolean }
  | { type: "REFRESH" };

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

// Reducer para gerenciar o estado do scanner
const scannerReducer = (
  state: ScannerState,
  action: ScannerAction
): ScannerState => {
  switch (action.type) {
    case "INITIALIZE_SUCCESS":
      return {
        ...state,
        isReady: true,
        isScanning: action.hasPermission,
        hasPermission: action.hasPermission,
        error: undefined,
      };
    case "INITIALIZE_ERROR":
      return {
        ...state,
        isReady: true,
        isScanning: false,
        hasPermission: false,
        error: action.error,
      };
    case "TOGGLE_SCAN":
      return { ...state, isScanning: action.isScanning };
    case "REFRESH":
      return { ...state, isScanning: state.hasPermission, error: undefined };
    default:
      return state;
  }
};

export default function Qr() {
  const scannerRef = useRef<QrScanner | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrBoxRef = useRef<HTMLDivElement>(null);
  const [autoCloseDialog, setAutoCloseDialog] = useState(true);

  const initialState: ScannerState = {
    isReady: false,
    isScanning: false,
    hasPermission: false,
  };

  const [scannerState, dispatch] = useReducer(scannerReducer, initialState);
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

  const { presences, forecastMap, confirmPresence, removePresence } =
    usePresenceManagement(filters);

  useEffect(() => {
    let isCancelled = false;

    const startScanner = async () => {
      if (!videoRef.current) return;

      try {
        const hasPermission = await QrScanner.hasCamera();
        if (!hasPermission) {
          if (!isCancelled) {
            dispatch({
              type: "INITIALIZE_ERROR",
              error: "Permissão da câmera não concedida.",
            });
          }
          return;
        }

        const scanner = new QrScanner(
          videoRef.current,
          (result) => onScanSuccess(result),
          {
            onDecodeError: onScanFail,
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            overlay: qrBoxRef.current ?? undefined,
          }
        );
        scannerRef.current = scanner;

        await scanner.start();
        if (!isCancelled) {
          dispatch({ type: "INITIALIZE_SUCCESS", hasPermission: true });
        }
      } catch (err: any) {
        console.error("Erro ao iniciar o scanner:", err);
        if (!isCancelled) {
          dispatch({
            type: "INITIALIZE_ERROR",
            error: String(
              err?.message ?? "Erro desconhecido ao iniciar a câmera."
            ),
          });
        }
      }
    };

    startScanner();

    return () => {
      isCancelled = true;
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  const onScanSuccess = async (result: QrScanner.ScanResult) => {
    const uuid = (result?.data || "").trim();
    if (!uuid || uuid === lastScanResult) return;

    setLastScanResult(uuid);
    const { date, meal, unit } = currentFiltersRef.current;

    try {
      const { data: previsao } = await supabase
        .from("rancho_previsoes")
        .select("vai_comer")
        .eq("user_id", uuid)
        .eq("data", date)
        .eq("refeicao", meal)
        .eq("unidade", unit)
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
    if (String(err) !== "No QR code found") {
      console.warn("QR Scan Error:", err);
    }
  };

  const handleConfirmDialog = useCallback(async () => {
    if (!dialog.uuid) return;

    try {
      await confirmPresence(dialog.uuid, dialog.willEnter === "sim");
    } catch (err) {
      console.error("Falha ao confirmar presença:", err);
    } finally {
      setDialog((d) => ({ ...d, open: false, uuid: null }));
    }
  }, [dialog.uuid, dialog.willEnter, confirmPresence]);

  const toggleScan = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      if (scannerState.isScanning) {
        scanner.stop();
        dispatch({ type: "TOGGLE_SCAN", isScanning: false });
      } else {
        await scanner.start();
        dispatch({ type: "TOGGLE_SCAN", isScanning: true });
      }
    } catch (err) {
      console.error("Erro ao alternar scanner:", err);
    }
  }, [scannerState.isScanning]);

  const refresh = useCallback(async () => {
    if (scannerRef.current) {
      await scannerRef.current.start();
      dispatch({ type: "REFRESH" });
    }
  }, []);

  useEffect(() => {
    if (!dialog.open || !autoCloseDialog) return;

    const timerId = setTimeout(() => {
      handleConfirmDialog();
    }, 3000);

    return () => clearTimeout(timerId);
  }, [dialog.open, autoCloseDialog, handleConfirmDialog]);

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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <Filters
          selectedDate={filters.date}
          setSelectedDate={(newDate: string) =>
            setFilters((f) => ({ ...f, date: newDate }))
          }
          selectedMeal={filters.meal}
          setSelectedMeal={(newMeal: MealKey) =>
            setFilters((f) => ({ ...f, meal: newMeal }))
          }
          selectedUnit={filters.unit}
          setSelectedUnit={(newUnit: string) =>
            setFilters((f) => ({ ...f, unit: newUnit }))
          }
          dates={dates}
        />
        <div className="flex items-center gap-2">
          <Switch
            id="autoClose"
            checked={autoCloseDialog}
            onCheckedChange={setAutoCloseDialog}
          />
          <Label htmlFor="autoClose">
            {autoCloseDialog ? "Fechar Auto." : "Fechar Manual"}
          </Label>
          <Button
            variant="outline"
            size="sm"
            onClick={actions.toggleScan}
            disabled={!scannerState.hasPermission}
          >
            <Camera className="h-4 w-4 mr-2" />
            {scannerState.isScanning ? "Pausar" : "Ler"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={actions.refresh}
            disabled={!scannerState.hasPermission}
          >
            <RefreshCw
              className={`h-4 w-4 ${scannerState.isScanning ? "animate-spin" : ""}`}
            />
          </Button>
          {lastScanResult && (
            <Button variant="secondary" size="sm" onClick={actions.clearResult}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      <div className="qr-reader relative">
        <video
          ref={videoRef}
          className="rounded-md w-full max-h-[60vh] object-cover"
        />
        {!scannerState.hasPermission && scannerState.isReady && (
          <div className="text-center p-4 border rounded-md bg-destructive/10 text-destructive">
            <p>{scannerState.error || "Acesso à câmera negado."}</p>
          </div>
        )}
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
        setDialog={setDialog}
        dialog={dialog}
        confirmDialog={handleConfirmDialog}
        selectedUnit={filters.unit}
      />
    </div>
  );
}
