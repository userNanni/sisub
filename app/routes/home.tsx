import type { Route } from "./+types/home";

import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  Coffee,
  Utensils,
  Moon,
  Sun,
  Building2,
  CheckCircle,
  Clock,
  Shield,
  ArrowRight,
  Smartphone,
  BarChart3,
} from "lucide-react";
import Footer from "~/components/Footer";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Previsão de Rancho" },
    { name: "description", content: "Faça seu raçoamento" },
  ];
}

export default function Home() {
  const features = [
    {
      icon: Calendar,
      title: "Planejamento de 30 dias",
      description:
        "Visualize e planeje suas refeições para os próximos 30 dias de forma simples e intuitiva.",
    },
    {
      icon: Utensils,
      title: "4 tipos de refeição",
      description:
        "Café da manhã, almoço, janta e ceia - marque quais refeições você irá consumir.",
    },
    {
      icon: Building2,
      title: "Por Organização Militar",
      description:
        "Sistema organizado por OM, facilitando o controle e gestão do rancho.",
    },
    {
      icon: Smartphone,
      title: "Interface responsiva",
      description:
        "Acesse de qualquer dispositivo - computador, tablet ou smartphone.",
    },
    {
      icon: Shield,
      title: "Seguro e confiável",
      description:
        "Autenticação segura e dados protegidos com tecnologia Supabase.",
    },
    {
      icon: BarChart3,
      title: "Controle de demanda",
      description:
        "Ajude a administração a prever a demanda e reduzir o desperdício de alimentos.",
    },
  ];

  const mealTypes = [
    { icon: Coffee, label: "Café da Manhã", color: "text-orange-600" },
    { icon: Utensils, label: "Almoço", color: "text-green-600" },
    { icon: Moon, label: "Janta", color: "text-blue-600" },
    { icon: Sun, label: "Ceia", color: "text-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="flex justify-center">
            <Badge className="bg-blue-100 text-blue-800 px-4 py-2 text-sm font-medium">
              Sistema de Previsão de Rancho
            </Badge>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-8xl k2d-extrabold font-bold text-gray-900 leading-tight">
            Sistema de
            <span className="text-blue-600 block">Subsistência</span>
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Sistema inteligente para previsão de demanda do rancho. Planeje suas
            refeições, reduza desperdícios e otimize a gestão alimentar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            <Link to="/login">
              <Button size="lg" className="px-8 py-3 text-lg font-semibold">
                Acessar Sistema
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Shield className="h-4 w-4" />
              <span>Login seguro necessário</span>
            </div>
          </div>
        </div>
      </div>

      {/* Como Funciona */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Como funciona o sistema
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Um processo simples e eficiente para gerenciar suas previsões de
            refeições
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Passo 1 */}
          <Card className="text-center border-2 hover:border-blue-200 transition-colors">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">1. Faça Login</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Acesse o sistema com suas credenciais militares de forma segura
                através da autenticação Supabase.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Passo 2 */}
          <Card className="text-center border-2 hover:border-green-200 transition-colors">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">2. Selecione os Dias</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Visualize os próximos 30 dias em cards organizados e selecione
                as refeições que irá consumir.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Passo 3 */}
          <Card className="text-center border-2 hover:border-purple-200 transition-colors">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-xl">
                3. Confirme Automaticamente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Suas seleções são salvas automaticamente, ajudando na previsão
                de demanda do rancho.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tipos de Refeição */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tipos de refeição disponíveis
            </h2>
            <p className="text-gray-600">
              Marque quais refeições você irá consumir em cada dia
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {mealTypes.map((meal, index) => {
              const Icon = meal.icon;
              return (
                <Card
                  key={index}
                  className="text-center hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Icon className={`h-6 w-6 ${meal.color}`} />
                    </div>
                    <CardTitle className="text-lg">{meal.label}</CardTitle>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Principais funcionalidades
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Desenvolvido especificamente para atender as necessidades do rancho
            militar
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500"
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CTA Final */}
      <div className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Faça parte da modernização do SISUB. Acesse
            agora e comece a planejar suas refeições de forma inteligente.
          </p>

          <Link to="/login">
            <Button
              size="lg"
              variant="secondary"
              className="px-8 py-3 text-lg font-semibold"
            >
              Fazer Login
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>

          <div className="flex justify-center items-center space-x-6 mt-8 text-blue-200">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">Sistema colaborativo</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Disponível 24/7</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm">Dados seguros</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
