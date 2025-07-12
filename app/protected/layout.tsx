import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../auth/auth"; // Ajuste o caminho conforme sua estrutura
import { Button } from "@/components/ui/button";
import { LogOut, User, Home } from "lucide-react";

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
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            <div className="flex items-center space-x-3">
              <Home className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                Sistema de Previsão
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t mt-auto">
        
      </footer>
    </div>
  );
}