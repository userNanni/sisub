import { Outlet, Navigate, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../auth/auth";
import RanchoHeader from "~/components/RanchoHeader";
import { useState, useEffect } from "react";
import { QrCode, Calendar } from "lucide-react";

export default function ProtectedLayout() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user === null) {
      setShouldRedirect(true);
    }
    setIsLoading(false);
  }, [user]);

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

  if (shouldRedirect) {
    return <Navigate to="/login" replace />;
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
