import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home/home.tsx"),

    layout("./auth/layout.tsx", [
      route("login", "./auth/login.tsx"),
      route("register", "./auth/register.tsx"),
    ]),

    layout("./protected/layout.tsx", [
      route("rancho", "./protected/rancho.tsx")
    ]),

    // Nova rota API para Power BI
  route("api/rancho", "./routes/apiRancho.tsx"),

] satisfies RouteConfig;