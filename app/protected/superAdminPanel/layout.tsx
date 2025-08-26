import { Outlet, Navigate } from "react-router-dom";
import { checkUserLevel, useAuth } from "@/auth/auth";
import { useState, useEffect } from "react";

export default function FiscalLayout() {
  const { user } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const fetchUserLevel = async () => {
      if (user?.id) {
        const level = await checkUserLevel(user.id);
        if (level !== "superadmin") {
          setShouldRedirect(true);
        }
      }
    };
    fetchUserLevel();
  }, [user]);

  if (shouldRedirect) {
    return <Navigate to="/rancho" replace />;
  }

  return <Outlet />;
}
