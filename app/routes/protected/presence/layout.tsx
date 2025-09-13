import { Outlet, Navigate } from "react-router";
import { checkUserLevel } from "@/auth/adminService";
import { useAuth } from "@/auth/auth";
import { useState, useEffect } from "react";

export default function FiscalLayout() {
  const { user } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  let userLevel = checkUserLevel(user?.id);

  useEffect(() => {
    const fetchUserLevel = async () => {
      if (user?.id) {
        const level = await checkUserLevel(user.id);
        if (level === null) {
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
