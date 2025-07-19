import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "./auth";

export default function AuthLayout() {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/rancho" replace />;
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-7xl md:text-8xl font-black text-blue-600 block k2d-extrabold">SISUB</h1>
          <p className="text-gray-600">Gerencie a demanda do rancho</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
