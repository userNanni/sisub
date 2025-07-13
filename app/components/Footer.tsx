import { 
    Building2, 
  } from "lucide-react";



export default function Footer() {
    return (
          <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Building2 className="h-6 w-6 text-blue-400" />
            <span className="text-lg font-semibold text-white">Sistema de Subsistência</span>
          </div>
          <p className="text-sm">
            Desenvolvido para otimizar a gestão de refeições nas unidades militares
          </p>
        </div>
      </footer>
  );
}
