import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home/home.tsx"),

    layout("./auth/layout.tsx", [
      route("login", "./auth/login.tsx"),
      route("register", "./auth/register.tsx"),
    ]),

    layout("./protected/layout.tsx", [
      route("rancho", "./protected/home/rancho.tsx"),
      route("fiscal", "./protected/fiscal/fiscal.tsx"),
    ]),

    // Nova rota API para Power BI
  route("api/rancho", "./routes/apiRancho.tsx"),

] satisfies RouteConfig;