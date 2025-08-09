// Qr.tsx - Fluxo Fiscal
// 1) Escolher dia e refeição
// 2) Escanear QRCode do militar (uuid)
// 3) Validar previsão no Supabase e registrar presença
// 4) Listar presenças com exclusão

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import QrScanner from "qr-scanner";
import supabase from "@/utils/supabase"; // ajuste este import conforme seu projeto

// UI & Icons
import { Button } from "@/components/ui/button";
import {
  Camera,
  Loader2,
  RefreshCw,
  Calendar,
  Utensils,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type MealKey = "cafe" | "almoco" | "janta" | "ceia";

interface ScanState {
  isReady: boolean;
  isScanning: boolean;
  hasPermission: boolean;
  error?: string;
}

interface PresenceRow {
  id: string; // uuid do registro de presença
  user_id: string; // uuid do militar
  date: string; // yyyy-mm-dd
  meal: MealKey;
  created_at: string;
}

const generateDates = (days: number): string[] => {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
};

const MEAL_LABEL: Record<MealKey, string> = {
  cafe: "Café",
  almoco: "Almoço",
  janta: "Jantar",
  ceia: "Ceia",
};

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
  const scanner = useRef<QrScanner | null>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const qrBoxEl = useRef<HTMLDivElement>(null);

  const [scanState, setScanState] = useState<ScanState>({
    isReady: false,
    isScanning: false,
    hasPermission: true,
  });
  const [scannedResult, setScannedResult] = useState<string>("");

  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [selectedMeal, setSelectedMeal] = useState<MealKey>("almoco");
  const [presence, setPresence] = useState<PresenceRow[]>([]);

  const dates = useMemo(() => generateDates(30), []);

  // Iniciar scanner
  useEffect(() => {
    let isCancelled = false;

    const startScanner = async () => {
      if (!videoEl.current || scanner.current) return;

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
            setScanState((s) => ({
              ...s,
              hasPermission: false,
              isReady: true,
            }));
          }
          return;
        }

        scanner.current = new QrScanner(
          videoEl.current,
          (result) => {
            onScanSuccess(result);
          },
          {
            onDecodeError: onScanFail,
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            overlay: qrBoxEl.current ?? undefined,
          }
        );

        await scanner.current.start();
        if (!isCancelled) {
          setScanState({
            isReady: true,
            isScanning: true,
            hasPermission: true,
          });
        }
      } catch (err: any) {
        console.error("Erro ao iniciar o scanner:", err);
        if (!isCancelled) {
          setScanState({
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
      scanner.current?.stop();
      // @ts-ignore
      scanner.current?.destroy?.();
      scanner.current = null;
    };
  }, []);

  // Carregar presenças já registradas para o filtro atual
  useEffect(() => {
    const loadPresence = async () => {
      const { data, error } = await supabase
        .from("rancho_presencas")
        .select("id, user_id, date, meal, created_at")
        .eq("date", selectedDate)
        .eq("meal", selectedMeal)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar presenças:", error);
        toast.error("Erro", {
          description: "Não foi possível carregar as presenças.",
        });
        return;
      }
      setPresence(data || []);
    };

    loadPresence();
  }, [selectedDate, selectedMeal]);

  const onScanSuccess = async (result: QrScanner.ScanResult) => {
    const uuid = (result?.data || "").trim();
    if (!uuid) return;

    setScannedResult(uuid);

    try {
      // 1) Valida previsão: precisa estar TRUE para aquele dia/refeição
      const { data: previsao, error: prevError } = await supabase
        .from("rancho_previsoes")
        .select("vai_comer")
        .eq("user_id", uuid)
        .eq("data", selectedDate)
        .eq("refeicao", selectedMeal)
        .maybeSingle();

      if (prevError) throw prevError;

      if (!previsao || !previsao.vai_comer) {
        toast.error("Não autorizado", {
          description: "Militar não previsto para esta refeição/dia.",
        });
        return;
      }

      // 2) Insere presença (única por date+meal+user_id)
      const { data: inserted, error: insError } = await supabase
        .from("rancho_presencas")
        .insert({ user_id: uuid, date: selectedDate, meal: selectedMeal })
        .select();

      if (insError) {
        if ((insError as any).code === "23505") {
          toast.info("Já registrado", {
            description: "Este militar já foi marcado presente.",
          });
        } else {
          throw insError;
        }
        return;
      }

      const newRow = inserted?.[0] as PresenceRow | undefined;
      if (newRow) {
        setPresence((prev) => [newRow, ...prev]);
        toast.success("Presença registrada", {
          description: `UUID ${uuid} marcado.`,
        });
      }
    } catch (err) {
      console.error("Erro no processamento do QR:", err);
      toast.error("Erro", { description: "Falha ao processar QR." });
    }
  };

  const onScanFail = (err: string | Error) => {
    console.warn("QR Error:", err);
  };

  const actions = useMemo(
    () => ({
      toggleScan: async () => {
        if (!scanner.current) return;
        try {
          if (scanState.isScanning) {
            await scanner.current.stop();
            setScanState((s) => ({ ...s, isScanning: false }));
          } else {
            await scanner.current.start();
            setScanState((s) => ({ ...s, isScanning: true }));
          }
        } catch (err) {
          console.error("Erro ao alternar scanner:", err);
        }
      },
      refresh: async () => {
        try {
          await scanner.current?.stop();
        } catch {}
        try {
          await scanner.current?.start();
          setScanState((s) => ({ ...s, isScanning: true, isReady: true }));
        } catch (err) {
          console.error("Erro ao atualizar scanner:", err);
        }
      },
      clearResult: () => setScannedResult(""),
      removePresence: async (id: string) => {
        const { error } = await supabase
          .from("rancho_presencas")
          .delete()
          .eq("id", id);
        if (error) {
          toast.error("Erro", { description: "Não foi possível excluir." });
          return;
        }
        setPresence((prev) => prev.filter((p) => p.id !== id));
      },
    }),
    [scanState.isScanning]
  );

  return (
    <div className="space-y-6">
      {/* Filtros de fiscalização */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dia
          </label>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Select
              value={selectedDate}
              onValueChange={(v) => setSelectedDate(v)}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Selecione o dia" />
              </SelectTrigger>
              <SelectContent>
                {dates.map((d) => (
                  <SelectItem value={d} key={d}>
                    {new Date(d).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Refeição
          </label>
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-gray-500" />
            <Select
              value={selectedMeal}
              onValueChange={(v) => setSelectedMeal(v as MealKey)}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Selecione a refeição" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MEAL_LABEL) as MealKey[]).map((k) => (
                  <SelectItem value={k} key={k}>
                    {MEAL_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={actions.toggleScan}>
            <Camera className="h-4 w-4 mr-2" />
            {scanState.isScanning ? "Pausar" : "Iniciar"}
          </Button>
          <Button variant="outline" size="sm" onClick={actions.refresh}>
            <RefreshCw
              className={`h-4 w-4 ${scanState.isScanning ? "animate-spin" : ""}`}
            />
          </Button>
          {scannedResult && (
            <Button variant="secondary" size="sm" onClick={actions.clearResult}>
              Limpar último
            </Button>
          )}
        </div>
      </div>

      {/* Leitor de QR */}
      <div className="qr-reader relative">
        <video
          ref={videoEl}
          className="rounded-md w-full max-h-[60vh] object-cover"
        />
        <div ref={qrBoxEl} className="qr-box pointer-events-none" />
        {scannedResult && (
          <p className="absolute top-2 left-2 z-50 text-white bg-black/60 rounded px-2 py-1">
            Último UUID: {scannedResult}
          </p>
        )}
      </div>

      {/* Lista de presenças */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Presenças registradas</h3>
            <p className="text-sm text-gray-500">
              Dia {new Date(selectedDate).toLocaleDateString("pt-BR")} ·{" "}
              {MEAL_LABEL[selectedMeal]}
            </p>
          </div>
          <Badge variant="secondary">{presence.length}</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>UUID</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Refeição</TableHead>
                <TableHead>Registrado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presence.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    Nenhuma presença registrada ainda.
                  </TableCell>
                </TableRow>
              ) : (
                presence.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {row.user_id}
                    </TableCell>
                    <TableCell>
                      {new Date(row.date).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>{MEAL_LABEL[row.meal]}</TableCell>
                    <TableCell>
                      {new Date(row.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => actions.removePresence(row.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
