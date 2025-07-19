import { Button } from "@/components/ui/button";
import { LogOut, User, Home } from "lucide-react";
import type { JSX } from "react";
import type { AuthContextType } from "~/auth/auth";

interface RanchoHeaderProps {
  user: AuthContextType["user"];
  signOut: () => Promise<JSX.Element>;
}

export default function RanchoHeader({ user, signOut }: RanchoHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            {window.innerWidth >= 640 ? (
              <Home className="h-6 w-6 text-blue-600" />
            ) : null}
            <h1 className="text-3xl font-black text-blue-600 block k2d-extrabold">
              SISUB
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <User className="h-4 w-4" />
              <span>{user?.email}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              {window.innerWidth >= 640 ? <span>Sair</span> : null}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
