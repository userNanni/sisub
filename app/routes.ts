import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    // Rota pública (home/landing)
    index("routes/home.tsx"),

    // Layout de autenticação (rotas públicas)
    layout("./auth/layout.tsx", [
      route("login", "./auth/login.tsx"),
      route("register", "./auth/register.tsx"),
    ]),

    // Layout protegido (rotas privadas)
    layout("./protected/layout.tsx", [
      route("rancho", "./protected/rancho.tsx")
    ]),

] satisfies RouteConfig;