import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import QrScanner from "qr-scanner";
import supabase from "@/utils/supabase";

// UI & Icons
import { Button } from "@/components/ui/button";
import {
  Camera,
  RefreshCw,
  Calendar,
  Utensils,
  Trash2,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "~/components/ui/label";
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

// shadcn alert dialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Unit selector
import { UnitSelector } from "@/components/UnitSelector";

type MealKey = "cafe" | "almoco" | "janta" | "ceia";

interface ScannerState {
  isReady: boolean;
  isScanning: boolean;
  hasPermission: boolean;
  error?: string;
}

interface PresenceRecord {
  id: string; // uuid do registro de presença
  user_id: string; // uuid do militar (nome da coluna do banco mantido)
  date: string; // yyyy-mm-dd
  meal: MealKey;
  created_at: string;
}

const generateRestrictedDates = (): string[] => {
  const today = new Date();
  const dates: string[] = [];
  for (const offset of [-1, 0, 1]) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
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

type DialogState = {
  open: boolean;
  uuid: string | null;
  systemForecast: boolean | null; // veio do banco (rancho_previsoes.vai_comer)
  forecastChoice: "sim" | "nao";
  willEnter: "sim" | "nao";
};

export default function Qr(): JSX.Element {
  const scannerRef = useRef<QrScanner | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrBoxRef = useRef<HTMLDivElement>(null);

  const [scannerState, setScannerState] = useState<ScannerState>({
    isReady: false,
    isScanning: false,
    hasPermission: true,
  });
  const [lastScanResult, setLastScanResult] = useState<string>("");

  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [selectedMeal, setSelectedMeal] = useState<MealKey>("almoco");
  const [selectedUnit, setSelectedUnit] = useState<string>("");

  const [presences, setPresences] = useState<PresenceRecord[]>([]);

  // Mapa user_id -> se está previsto (falou que ia) via rancho_previsoes.vai_comer
  const [forecastMap, setForecastMap] = useState<Record<string, boolean>>({});

  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    uuid: null,
    systemForecast: null,
    forecastChoice: "nao",
    willEnter: "sim",
  });

  const dates = useMemo(() => generateRestrictedDates(), []);

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
      // @ts-ignore
      scannerRef.current?.destroy?.();
      scannerRef.current = null;
    };
  }, []);

  // Carregar presenças e previsões (falou que ia) para o filtro atual
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
      const rows = data || [];
      setPresences(rows);

      if (rows.length > 0) {
        const userIds = Array.from(new Set(rows.map((p) => p.user_id)));
        const { data: previsoes, error: prevErr } = await supabase
          .from("rancho_previsoes")
          .select("user_id, vai_comer")
          .eq("data", selectedDate)
          .eq("refeicao", selectedMeal)
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
  }, [selectedDate, selectedMeal]);

  const onScanSuccess = async (result: QrScanner.ScanResult) => {
    const uuid = (result?.data || "").trim();
    if (!uuid) return;

    setLastScanResult(uuid);

    try {
      // Obter previsão do sistema (vai_comer) para exibir no diálogo
      const { data: previsao, error: prevError } = await supabase
        .from("rancho_previsoes")
        .select("vai_comer")
        .eq("user_id", uuid)
        .eq("data", selectedDate)
        .eq("refeicao", selectedMeal)
        .maybeSingle();

      if (prevError) throw prevError;

      setDialog({
        open: true,
        uuid,
        systemForecast: previsao ? !!previsao.vai_comer : null,
        forecastChoice: previsao && previsao.vai_comer ? "sim" : "nao",
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

      // Inserir presença (única por date+meal+user_id)
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
        // where mais específico: id + data + refeição + user_id
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
        {/* Dia */}
        <div className="flex-1">
          {(() => {
            const isValidDate = !selectedDate || dates.includes(selectedDate);
            const size: "sm" | "md" | "lg" = "md";
            const disabled = false;
            const base = "w-full transition-all duration-200";
            const sizeMap = { sm: "text-sm", md: "", lg: "text-lg" };
            let trigger = `${base} ${sizeMap[size]}`;

            if (disabled) {
              trigger += " cursor-not-allowed opacity-60";
            } else {
              trigger += " cursor-pointer hover:border-gray-400";
            }
            // Azul como padrão, vermelho em erro (igual UnitSelector)
            trigger += " focus:border-blue-400 focus:ring-blue-200";
            if (selectedDate && !isValidDate) {
              trigger += " border-red-300 bg-red-50";
            }

            const labelCls = `text-sm font-medium flex items-center justify-between ${
              disabled ? "text-gray-500" : "text-gray-700"
            }`;

            return (
              <div className="space-y-2">
                <Label className={labelCls}>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Dia:</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedDate && !isValidDate && (
                      <>
                        <Badge
                          variant="outline"
                          className="text-xs text-red-600 border-red-300 bg-red-50"
                        >
                          Inválido
                        </Badge>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      </>
                    )}
                  </div>
                </Label>

                <Select
                  value={selectedDate}
                  onValueChange={(v) => setSelectedDate(v)}
                  disabled={disabled}
                >
                  <SelectTrigger className={trigger}>
                    <SelectValue placeholder="Selecione o dia">
                      {selectedDate && (
                        <div className="flex items-center space-x-2">
                          <span>
                            {new Date(selectedDate).toLocaleDateString(
                              "pt-BR",
                              {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>

                  <SelectContent className="max-h-60">
                    <div className="p-2 text-xs text-gray-500 border-b">
                      Selecione o dia do cardápio
                    </div>
                    {dates.map((d) => {
                      const selected = d === selectedDate;
                      return (
                        <SelectItem
                          className="cursor-pointer hover:bg-gray-50 focus:bg-gray-50 transition-colors"
                          value={d}
                          key={d}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>
                              {new Date(d).toLocaleDateString("pt-BR", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </span>
                            {selected && (
                              <Check className="h-4 w-4 text-green-600 ml-2" />
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {selectedDate && !isValidDate && (
                  <div className="text-xs text-red-600 flex items-center space-x-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Data inválida selecionada</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Refeição */}
        <div className="flex-1">
          {(() => {
            const mealKeys = Object.keys(MEAL_LABEL) as MealKey[];
            const isValidMeal =
              !selectedMeal || mealKeys.includes(selectedMeal);
            const size: "sm" | "md" | "lg" = "md";
            const disabled = false;
            const base = "w-full transition-all duration-200";
            const sizeMap = { sm: "text-sm", md: "", lg: "text-lg" };
            let trigger = `${base} ${sizeMap[size]}`;

            if (disabled) {
              trigger += " cursor-not-allowed opacity-60";
            } else {
              trigger += " cursor-pointer hover:border-gray-400";
            }
            trigger += " focus:border-blue-400 focus:ring-blue-200";
            if (selectedMeal && !isValidMeal) {
              trigger += " border-red-300 bg-red-50";
            }

            const labelCls = `text-sm font-medium flex items-center justify-between ${
              disabled ? "text-gray-500" : "text-gray-700"
            }`;

            return (
              <div className="space-y-2">
                <Label className={labelCls}>
                  <div className="flex items-center space-x-1">
                    <Utensils className="h-4 w-4" />
                    <span>Refeição:</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedMeal && !isValidMeal && (
                      <>
                        <Badge
                          variant="outline"
                          className="text-xs text-red-600 border-red-300 bg-red-50"
                        >
                          Inválida
                        </Badge>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      </>
                    )}
                  </div>
                </Label>

                <Select
                  value={selectedMeal}
                  onValueChange={(v) => setSelectedMeal(v as MealKey)}
                  disabled={disabled}
                >
                  <SelectTrigger className={trigger}>
                    <SelectValue placeholder="Selecione a refeição">
                      {selectedMeal && (
                        <div className="flex items-center space-x-2">
                          <span>{MEAL_LABEL[selectedMeal]}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>

                  <SelectContent className="max-h-60">
                    <div className="p-2 text-xs text-gray-500 border-b">
                      Selecione o tipo de refeição
                    </div>
                    {mealKeys.map((k) => {
                      const selected = k === selectedMeal;
                      return (
                        <SelectItem
                          className="cursor-pointer hover:bg-gray-50 focus:bg-gray-50 transition-colors"
                          value={k}
                          key={k}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{MEAL_LABEL[k]}</span>
                            {selected && (
                              <Check className="h-4 w-4 text-green-600 ml-2" />
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {selectedMeal && !isValidMeal && (
                  <div className="text-xs text-red-600 flex items-center space-x-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Refeição inválida selecionada</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Unidade (já no estilo certo) */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-full sm:w-64">
              <UnitSelector
                value={selectedUnit}
                onChange={setSelectedUnit}
                placeholder="Selecione a OM..."
              />
            </div>
          </div>
        </div>

        {/* Ações do scanner (inalteradas) */}
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
          <Badge variant="secondary">{presences.length}</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>UUID</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Refeição</TableHead>
                <TableHead>Previsão</TableHead>
                <TableHead>Registrado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presences.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    Nenhuma presença registrada ainda.
                  </TableCell>
                </TableRow>
              ) : (
                presences.map((row) => {
                  const saidWouldAttend = forecastMap[row.user_id] ?? false;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">
                        {row.user_id}
                      </TableCell>
                      <TableCell>
                        {new Date(row.date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>{MEAL_LABEL[row.meal]}</TableCell>
                      <TableCell>
                        {saidWouldAttend ? (
                          <Badge className="bg-green-100 text-green-700 border border-green-200">
                            Sim
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">
                            Não
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(row.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => actions.removePresence(row)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialogo de decisão do fiscal */}
      <AlertDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar entrada do militar</AlertDialogTitle>
            <AlertDialogDescription>
              UUID: {dialog.uuid}
              <br />
              Previsão do sistema:{" "}
              {dialog.systemForecast === null
                ? "Não encontrado"
                : dialog.systemForecast
                  ? "Previsto"
                  : "Não previsto"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Está na previsão?</div>
              <div className="flex gap-2">
                <Button
                  disabled
                  variant={
                    dialog.forecastChoice === "sim" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setDialog((d) => ({ ...d, forecastChoice: "sim" }))
                  }
                >
                  Sim
                </Button>
                <Button
                  disabled
                  variant={
                    dialog.forecastChoice === "nao" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setDialog((d) => ({ ...d, forecastChoice: "nao" }))
                  }
                >
                  Não
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Vai entrar?</div>
              <div className="flex gap-2">
                <Button
                  variant={dialog.willEnter === "sim" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDialog((d) => ({ ...d, willEnter: "sim" }))}
                >
                  Sim
                </Button>
                <Button
                  variant={dialog.willEnter === "nao" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDialog((d) => ({ ...d, willEnter: "nao" }))}
                >
                  Não
                </Button>
              </div>
            </div>

            {selectedUnit && (
              <div className="text-xs text-gray-500">
                OM selecionada: {selectedUnit}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDialog((d) => ({ ...d, open: false }))}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
