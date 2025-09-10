import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { Loader2 } from "lucide-react";

const REDIRECT_KEY = "auth:redirectTo";

// Lê redirectTo da query e/ou do state
function getRedirectCandidates(locationSearch: string, locationState?: any) {
  const params = new URLSearchParams(locationSearch);
  const qsTarget = params.get("redirectTo"); // /login?redirectTo=...
  const stateFrom = locationState?.from;
  const stateTarget =
    stateFrom && typeof stateFrom === "object"
      ? `${stateFrom.pathname ?? ""}${stateFrom.search ?? ""}`
      : locationState?.from?.pathname || null; // compat
  const stored = sessionStorage.getItem(REDIRECT_KEY);
  return { qsTarget, stateTarget, stored };
}

function safeRedirect(
  target: string | null | undefined,
  fallback = "/rancho"
): string {
  if (!target) return fallback;
  let decoded = target;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    // mantém target original se falhar
  }
  // Aceita apenas caminhos internos tipo "/alguma-coisa" (não "//dominio")
  if (decoded.startsWith("/") && !decoded.startsWith("//")) {
    return decoded;
  }
  return fallback;
}

export default function AuthLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  const isResetPasswordRoute = location.pathname.startsWith(
    "/auth/reset-password"
  );

  // Persistir redirectTo da query sempre que presente (para não perder entre páginas de auth)
  // Ex.: /login?redirectTo=%2Fcheckin%3Fu%3DDIRAD%20-%20DIRAD
  // Também preserva se navegar para /register, etc.
  const params = new URLSearchParams(location.search);
  const qsRedirect = params.get("redirectTo");
  if (qsRedirect) {
    sessionStorage.setItem(REDIRECT_KEY, qsRedirect);
  }

  // Loading: evita flicker
  if (isLoading) {
    return (
      <div className="h-full bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <h1 className="text-7xl md:text-8xl font-black text-blue-600 k2d-extrabold">
            SISUB
          </h1>
          <p className="text-gray-600">Gerencie a demanda do rancho</p>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="w-full flex items-center justify-center py-12 bg-white rounded-md shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            <span className="ml-2 text-sm text-gray-600">
              Verificando autenticação...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Se já estiver logado e não for a rota de reset de senha, redireciona
  if (user && !isResetPasswordRoute) {
    const { qsTarget, stateTarget, stored } = getRedirectCandidates(
      location.search,
      location.state
    );
    // Prioridade: query > stored > state
    const rawTarget = qsTarget ?? stored ?? stateTarget;
    const target = safeRedirect(rawTarget, "/rancho");

    // Consumir o redirect salvo (para não vazar para próximos acessos)
    if (stored) sessionStorage.removeItem(REDIRECT_KEY);

    return <Navigate to={target} replace />;
  }

  // Páginas de auth (login, register, reset)
  return (
    <div className="h-full bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-7xl md:text-8xl font-black text-blue-600 k2d-extrabold">
            SISUB
          </h1>
          <p className="text-gray-600">Gerencie a demanda do rancho</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
