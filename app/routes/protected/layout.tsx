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
        // Dê um micro-tempo para o provider propagar mudanças do supabase-js
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

  return (
    <div className="min-h-screen bg-gray-50">
      <RanchoHeader user={user} signOut={handleSignOut} />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
