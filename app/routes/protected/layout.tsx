import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/auth";
import RanchoHeader from "~/components/RanchoHeader";
import { useState, useEffect, useRef } from "react";

export default function ProtectedLayout() {
  const navigate = useNavigate();
  const { user, isLoading, refreshSession, signOut } = useAuth();
  const location = useLocation();

  const attemptedRecoveryRef = useRef(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (user) return;
    if (attemptedRecoveryRef.current) return;

    attemptedRecoveryRef.current = true;
    setRecovering(true);

    (async () => {
      try {
        await refreshSession().catch(() => {});
        await new Promise((r) => setTimeout(r, 50));
      } finally {
        setRecovering(false);
      }
    })();
  }, [isLoading, user, refreshSession]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirectTo = encodeURIComponent(
      `${location.pathname}${location.search}`
    );
    return <Navigate to={`/login?redirectTo=${redirectTo}`} replace />;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      throw new Error(error instanceof Error ? error.message : "Erro ao sair");
    }
  };

  // Rotas que precisam de "full-bleed" (sem max-width e sem padding lateral)
  const fullBleedRoutes = ["/admin", "/superadmin"];
  const isFullBleed = fullBleedRoutes.some((p) =>
    location.pathname.startsWith(p)
  );

  return (
    <div
      className={
        isFullBleed
          ? "min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50"
          : "min-h-screen bg-gray-50"
      }
    >
      <RanchoHeader user={user} signOut={handleSignOut} />
      <main
        className={
          isFullBleed
            ? // Full-bleed: sem max-width e sem padding lateral, só padding vertical
              "py-6"
            : // Default: centralizado com max-width e paddings
              "max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8"
        }
      >
        <Outlet />
      </main>
    </div>
  );
}
