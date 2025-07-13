import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("confirm-email", "./routes/confirm-email.tsx"),

    layout("./auth/layout.tsx", [
      route("login", "./auth/login.tsx"),
      route("register", "./auth/register.tsx"),
    ]),

    layout("./protected/layout.tsx", [
      route("rancho", "./protected/rancho.tsx")
    ]),

] satisfies RouteConfig;