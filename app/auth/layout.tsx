import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "./auth";

export default function AuthLayout() {
  const { user, loading } = useAuth();

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (user) {
    return <Navigate to="/rancho" replace />;
  }

  // Layout para páginas de autenticação
  return (
    <div className="h-full bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema de Previsão
          </h1>
          <p className="text-gray-600">
            Gerencie a demanda do seu restaurante
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}