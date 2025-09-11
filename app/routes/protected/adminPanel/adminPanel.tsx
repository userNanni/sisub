import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import type { Route } from "./+types/adminPanel";
import { checkUserLevel, checkUserOm, useAuth } from "~/auth/auth";
import { Navigate } from "react-router";
// Ícones lucide-react
import {
  QrCode,
  Copy,
  Download,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Maximize2,
  ExternalLink,
} from "lucide-react";

// IMPORTANTE: UnitSelector
import { UnitSelector } from "@/components/UnitSelector";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Painel Admin" },
    { name: "description", content: "Controle sua unidade" },
  ];
}

// Skeleton simples no estilo shadcn + tailwind
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
  );
}

export default function AdminPanel() {
  const { user } = useAuth();

  const [status, setStatus] = useState<
    "checking" | "authorized" | "unauthorized"
  >("checking"); /* 
  const [userOm, setUserOm] = useState<string>(""); */
  const [error, setError] = useState<string | null>(null);

  // Unidade selecionada via UnitSelector (default = OM do usuário)
  const [selectedOm, setSelectedOm] = useState<string>("");

  // Entradas com fade-in
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Checagem de nível de usuário e OM
  useEffect(() => {
    let active = true;

    const fetchUserLevel = async () => {
      if (!user?.id) return;
      setStatus("checking");
      setError(null);
      try {
        const userLevel = await checkUserLevel(user.id);
        if (!active) return;
        if (userLevel === "admin" || userLevel === "superadmin") {
          setStatus("authorized");
        } else {
          setStatus("unauthorized");
        }
      } catch (e) {
        if (!active) return;
        setError(
          "Não foi possível verificar suas permissões. Tente novamente."
        );
        setStatus("unauthorized");
      }
    };

    /* const fetchUserOm = async () => {
      if (!user?.id) return;
      try {
        const om = await checkUserOm(user.id);
        if (!active) return;
        setUserOm(om || "");
      } catch (e) {
        if (!active) return;
        console.error("Erro ao buscar OM do usuário:", e);
      }
    };
 */
    fetchUserLevel();
    /* fetchUserOm(); */
    return () => {
      active = false;
    };
  }, [user?.id]);

  // Define o default do UnitSelector quando a OM do usuário chega
  useEffect(() => {
    if (/* userOm && */ !selectedOm) {
      /* setSelectedOm(userOm) */
    }
  }, [/* userOm, */ selectedOm]);

  // Redirect se não tem permissão
  if (status === "unauthorized") {
    return <Navigate to="/rancho" replace />;
  }

  // OM atual utilizada no QR e nas ações
  const currentOm = selectedOm; /* || userOm */

  // Ações do QR (copiar / baixar)
  const qrWrapRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyOm = async () => {
    try {
      if (!currentOm) return;
      await navigator.clipboard.writeText(currentOm);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("Não foi possível copiar a OM.");
    }
  };

  const handleDownloadPng = () => {
    const canvas: HTMLCanvasElement | null =
      (qrWrapRef.current?.querySelector("canvas") as HTMLCanvasElement) ?? null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-auto-checkin-${currentOm || "om"}.png`;
    a.click();
  };

  // Expansão full-bleed do card de Indicadores (depende do layout permitir)
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => setExpanded((e) => !e);

  // Altura do iframe
  const frameHeight = useMemo(() => "clamp(520px, 78vh, 1000px)", []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero */}
      <section
        id="hero"
        className={`container mx-auto max-w-screen-2xl px-4 pt-10 md:pt-14 transition-all duration-500 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200 mb-3">
            <ShieldBadge />
            Painel Administrativo
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Controles da sua OM
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Gere o QR de auto check-in e acompanhe indicadores da unidade em
            tempo real.
          </p>
          {error && (
            <div
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700"
              role="alert"
            >
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </section>

      {/* Conteúdo */}
      <section
        id="content"
        className={`container mx-auto max-w-screen-2xl px-4 py-10 md:py-14 transition-all duration-500 delay-100 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {status === "checking" ? (
          // Loading State (skeletons) — empilhados
          <div className="grid grid-cols-1 gap-6 lg:gap-8">
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="flex flex-col items-center">
                <Skeleton className="h-40 w-40 rounded-lg mb-4" />
                <div className="flex gap-2 w-full">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-60" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-[520px] w-full rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:gap-8">
            {/* Card: Indicadores (Power BI) — primeiro e destacado */}
            <div
              className={`bg-white rounded-2xl border border-blue-100 shadow-sm ${
                expanded ? "p-0" : "p-6"
              }`}
            >
              {/* Barra superior */}
              <div
                className={`${
                  expanded ? "px-4 py-3" : "mb-4"
                } flex items-center justify-between`}
              >
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  Indicadores
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      window.open(
                        "https://app.powerbi.com/view?r=eyJrIjoiMmQxYjdlMDYtZmE5MC00N2QwLTgxYmItMjRlNWVmMjA3MjgzIiwidCI6ImViMjk0Zjg5LTUwNWUtNDI4MC1iYjdiLTFlMzlhZjg5YTg4YyJ9",
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                    className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
                    aria-label="Abrir relatório em nova aba"
                    title="Abrir em nova aba"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Abrir
                  </button>

                  <button
                    onClick={toggleExpanded}
                    className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
                    aria-pressed={expanded}
                    aria-label={expanded ? "Reduzir" : "Expandir"}
                    title={expanded ? "Reduzir" : "Expandir"}
                  >
                    <Maximize2 className="h-4 w-4" aria-hidden="true" />
                    {expanded ? "Reduzir" : "Expandir"}
                  </button>
                </div>
              </div>

              {/* Wrapper full-bleed quando expandido */}
              <div className={expanded ? "" : "px-0"}>
                {/* Conteúdo do card */}
                <div
                  className={`${
                    expanded ? "" : "px-6"
                  } pb-4 flex flex-col gap-3`}
                >
                  {!expanded && (
                    <>
                      <h2 className="text-xl font-bold text-gray-900">
                        Indicadores da Unidade
                      </h2>
                      <p className="text-gray-600 text-sm">
                        Acompanhe métricas e relatórios consolidados. Expanda
                        para tela cheia para melhor visualização.
                      </p>
                    </>
                  )}
                </div>

                {/* Container do iframe */}
                <div className={`${expanded ? "" : "px-6"} pb-6`}>
                  <div className="rounded-2xl border border-gray-200 overflow-hidden bg-gray-50">
                    <iframe
                      title="Indicadores SISUB - Power BI"
                      src="https://app.powerbi.com/view?r=eyJrIjoiMmQxYjdlMDYtZmE5MC00N2QwLTgxYmItMjRlNWVmMjA3MjgzIiwidCI6ImViMjk0Zjg5LTUwNWUtNDI4MC1iYjdiLTFlMzlhZjg5YTg4YyJ9"
                      className="w-full"
                      style={{ height: frameHeight }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <div className="mt-3 text-xs text-gray-500 px-1">
                    Dica: use o botão de tela cheia dentro do relatório para
                    melhor experiência.
                  </div>
                </div>
              </div>
            </div>

            {/* Card: QR Code Auto Check-In */}
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                  Auto Check-In
                </div>
                {currentOm ? (
                  <span className="text-xs text-gray-500">OM: {currentOm}</span>
                ) : (
                  <span className="text-xs text-gray-400">OM não definida</span>
                )}
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-4">
                QR Code de Auto Check-In
              </h2>

              {/* UnitSelector — escolhe a OM do QR (default = userOm) */}
              <div className="mb-4">
                <UnitSelector
                  value={selectedOm}
                  onChange={setSelectedOm}
                  disabled={status !== "authorized"}
                  hasDefaultUnit={
                    false /* Boolean(userOm) && selectedOm === userOm */
                  }
                  showValidation={true}
                  size="md"
                  placeholder="Selecione uma unidade..."
                />
              </div>

              <div className="text-gray-600 text-sm mb-4">
                Exiba este QR no ponto de acesso. Usuários autorizados farão
                check-in pela câmera do celular.
              </div>

              <div
                ref={qrWrapRef}
                className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-6"
              >
                {currentOm ? (
                  <QRCodeCanvas
                    value={currentOm}
                    size={200}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#1f2937"
                    aria-label="QR code para auto check-in da OM"
                  />
                ) : (
                  <div
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700"
                    role="status"
                    aria-live="polite"
                  >
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    Defina uma OM para gerar o QR Code.
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleCopyOm}
                  disabled={!currentOm}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-150 shadow-sm ${
                    currentOm
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      Copiar OM
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownloadPng}
                  disabled={!currentOm}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-150 border ${
                    currentOm
                      ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Baixar PNG do QR
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// Badge do hero (ícone "escudo" estilizado via lucide-react)
function ShieldBadge() {
  return (
    <span className="inline-flex items-center justify-center rounded-full w-5 h-5 bg-blue-100 text-blue-700">
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z"
          stroke="currentColor"
          strokeWidth={2}
          fill="none"
        />
        <path
          d="M9.5 12l2 2 3.5-3.5"
          stroke="currentColor"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
