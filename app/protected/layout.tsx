import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../auth/auth";
import RanchoHeader from "~/components/RanchoHeader";

export default function ProtectedLayout() {
  const { user, signOut } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      return <Navigate to="/login" replace />;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Erro ao sair");
    }
  };

  return (
    <div className="min-h-screen h-full bg-gray-50">
      <a href="/" className="cursor-pointer" title="Página inicial">
        <RanchoHeader user={user} signOut={handleSignOut} />
      </a>
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
