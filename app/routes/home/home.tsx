import { useState, useEffect } from "react";
import { Link } from "react-router";
import Footer from "~/components/Footer";
import { steps, mealTypes, features } from "./homeData";
import HomeHero from "~/components/HomeHero";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Previsão SISUB" },
    { name: "description", content: "Ajude a melhorar o SISUB" },
  ];
}

export default function Home() {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState({
    hero: false,
    steps: false,
    meals: false,
    features: false,
    cta: false,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible((prev) => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting,
          }));
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll("[id]").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section */}
      {HomeHero(isVisible)}

      {/* Como Funciona */}
      <div
        id="steps"
        className={`container mx-auto px-4 py-16 transition-all duration-500 delay-100 ${
          isVisible.steps
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        }`}
      >
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
          {steps.map((step, index) => (
            <div
              key={index}
              className={`bg-white rounded-xl p-6 text-center border-2 ${step.color} transition-all duration-150 transform hover:scale-105 shadow-lg hover:shadow-xl`}
            >
              <div className="text-4xl mb-4">{step.icon}</div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tipos de Refeição com hover interativo */}
      <div
        id="meals"
        className={`bg-gray-50 py-16 transition-all duration-500 delay-150 ${
          isVisible.meals
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        }`}
      >
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
            {mealTypes.map((meal, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-all duration-150 transform hover:scale-105 cursor-pointer"
              >
                <div
                  className={`mx-auto w-16 h-16 ${meal.color} rounded-full flex items-center justify-center mb-4 text-2xl`}
                >
                  {meal.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{meal.label}</h3>
                {/* 
                <p className="text-sm text-gray-500">{meal.time}</p> */}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features com carrossel interativo */}
      <div
        id="features"
        className={`container mx-auto px-4 py-16 transition-all duration-500 delay-200 ${
          isVisible.features
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        }`}
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Principais funcionalidades
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Desenvolvido especificamente para atender as necessidades do rancho
            militar
          </p>
        </div>

        {/* Feature destacada */}
        <div className="max-w-4xl mx-auto mb-8">
          <div
            className={`bg-gradient-to-r ${features[currentFeature].color} rounded-2xl p-8 text-white text-center`}
          >
            <div className="text-6xl mb-4">{features[currentFeature].icon}</div>
            <h3 className="text-2xl font-bold mb-4">
              {features[currentFeature].title}
            </h3>
            <p className="text-lg opacity-90">
              {features[currentFeature].description}
            </p>
          </div>
        </div>

        {/* Navegação das features */}
        <div className="flex justify-center space-x-2 mb-8">
          {features.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentFeature(index)}
              className={`w-3 h-3 rounded-full transition-all duration-150 ${
                index === currentFeature
                  ? "bg-blue-600 scale-125"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
              title={`Selecionar funcionalidade ${features[index].title}`}
              aria-label={`Selecionar funcionalidade ${features[index].title}`}
            />
          ))}
        </div>

        {/* Grid de todas as features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              onClick={() => setCurrentFeature(index)}
              className={`bg-white rounded-xl p-6 cursor-pointer transition-all duration-150 transform hover:scale-105 border-l-4 ${
                index === currentFeature
                  ? "border-l-blue-500 shadow-lg"
                  : "border-l-gray-200 hover:border-l-blue-300"
              }`}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="text-2xl">{feature.icon}</div>
                <h3 className="text-lg font-bold">{feature.title}</h3>
              </div>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Final */}
      <div
        id="cta"
        className={`bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16 transition-all duration-500 delay-250 ${
          isVisible.cta
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Faça parte da modernização do SISUB. Acesse agora e comece a
            planejar suas refeições de forma inteligente.
          </p>

          <button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-150 transform hover:scale-105 shadow-lg hover:shadow-xl mb-8">
            Fazer Login →
          </button>

          <div className="flex flex-wrap justify-center items-center gap-6 text-blue-200">
            <div className="flex items-center space-x-2">
              <span>👥</span>
              <span className="text-sm">Sistema colaborativo</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>⏰</span>
              <span className="text-sm">Disponível 24/7</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🛡️</span>
              <span className="text-sm">Dados seguros</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer simples */}
      {Footer()}
    </div>
  );
}

