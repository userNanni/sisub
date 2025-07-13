import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../auth/auth"; 
import Footer from "~/components/Footer";
import RanchoHeader from "~/components/RanchoHeader";

export default function ProtectedLayout() {
    const { user, loading, signOut } = useAuth();
    
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      return <Navigate to="/login" replace />;
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="min-h-screen h-full bg-gray-50">
      <RanchoHeader user={user} handleSignOut={handleSignOut}/>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}