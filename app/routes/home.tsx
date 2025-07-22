import { useState, useEffect } from "react";
import { Link } from "react-router";

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

  const features = [
    {
      icon: "📅",
      title: "Planejamento de 30 dias",
      description:
        "Visualize e planeje suas refeições para os próximos 30 dias de forma simples e intuitiva.",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: "🍽️",
      title: "4 tipos de refeição",
      description:
        "Café da manhã, almoço, janta e ceia - marque quais refeições você irá consumir.",
      color: "from-green-500 to-green-600",
    },
    {
      icon: "🏢",
      title: "Por Organização Militar",
      description:
        "Sistema organizado por OM, facilitando o controle e gestão do rancho.",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: "📱",
      title: "Interface responsiva",
      description:
        "Acesse de qualquer dispositivo - computador, tablet ou smartphone.",
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: "🛡️",
      title: "Seguro e confiável",
      description:
        "Autenticação segura e dados protegidos com tecnologia Supabase.",
      color: "from-red-500 to-red-600",
    },
    {
      icon: "📊",
      title: "Controle de demanda",
      description:
        "Ajude a administração a prever a demanda e reduzir o desperdício de alimentos.",
      color: "from-indigo-500 to-indigo-600",
    },
  ];

  const mealTypes = [
    {
      icon: "☕",
      label: "Café da Manhã",
      color: "bg-orange-100 text-orange-600",
      time: "06:00 - 08:00",
    },
    {
      icon: "🍽️",
      label: "Almoço",
      color: "bg-green-100 text-green-600",
      time: "11:30 - 13:30",
    },
    {
      icon: "🌙",
      label: "Janta",
      color: "bg-blue-100 text-blue-600",
      time: "18:00 - 20:00",
    },
    {
      icon: "🌅",
      label: "Ceia",
      color: "bg-purple-100 text-purple-600",
      time: "21:00 - 22:00",
    },
  ];

  const steps = [
    {
      icon: "🔐",
      title: "Faça Login",
      description:
        "Acesse o sistema com suas credenciais militares de forma segura através da autenticação Supabase.",
      color: "border-blue-200 hover:border-blue-400",
    },
    {
      icon: "📅",
      title: "Selecione os Dias",
      description:
        "Visualize os próximos 30 dias em cards organizados e selecione as refeições que irá consumir.",
      color: "border-green-200 hover:border-green-400",
    },
    {
      icon: "✅",
      title: "Confirme Automaticamente",
      description:
        "Suas seleções são salvas automaticamente, ajudando na previsão de demanda do rancho.",
      color: "border-purple-200 hover:border-purple-400",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section com animação */}
      <div
        id="hero"
        className={`container mx-auto px-4 py-16 transition-all duration-500 ${
          isVisible.hero
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        }`}
      >
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="flex justify-center">
            <span className="bg-blue-100 text-blue-800 px-4 py-2 text-sm font-medium rounded-full animate-pulse">
              Sistema de Previsão de Rancho
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
            Sistema de
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600 block animate-pulse">
              Subsistência
            </span>
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Sistema inteligente para previsão de demanda do rancho. Planeje suas
            refeições, reduza desperdícios e otimize a gestão alimentar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            <Link to="/login">
              <button className="bg-gradient-to-r cursor-pointer from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-150 transform hover:scale-105 shadow-lg hover:shadow-xl">
                Acessar Sistema →
              </button>
            </Link>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="text-green-500">🛡️</span>
              <span>Login seguro necessário</span>
            </div>
          </div>
        </div>
      </div>

      {/* Como Funciona com animação */}
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

      {/* CTA Final com animação */}
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
      <footer className="bg-gray-900 text-white py-8 z-500">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2025 Sistema de Subsistência. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
