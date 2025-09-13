import { useEffect, useState } from "react";
import type { Route } from "./+types/superAdminPanel";
import { Navigate } from "react-router";
import { useAuth } from "@/auth/auth";
import { checkUserLevel } from "@/auth/adminService";

import SuperAdminHero from "@/components/super-admin/SuperAdminHero";
import IndicatorsCard from "@/components/super-admin/IndicatorsCard";
import ProfilesManager from "@/components/super-admin/ProfilesManager";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Painel SuperAdmin" },
    { name: "description", content: "Controle o Sistema" },
  ];
}

export default function SuperAdminPanel() {
  const { user } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const fetchUserLevel = async () => {
      if (!user?.id) return;
      const level = await checkUserLevel(user.id);
      if (level !== "superadmin") {
        setShouldRedirect(true);
      }
    };
    fetchUserLevel();
  }, [user?.id]);

  if (shouldRedirect) {
    return <Navigate to="/rancho" replace />;
  }

  // Fade-in de entrada
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero */}
      <section
        id="hero"
        className={`container mx-auto max-w-screen-2xl px-4 pt-10 md:pt-14 transition-all duration-500 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <SuperAdminHero />
      </section>

      {/* Conteúdo */}
      <section
        id="content"
        className={`container mx-auto max-w-screen-2xl px-4 py-10 md:py-14 transition-all duration-500 delay-100 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="grid grid-cols-1 gap-6 lg:gap-8">
          <IndicatorsCard />
          <ProfilesManager />
        </div>
      </section>
    </div>
  );
}
