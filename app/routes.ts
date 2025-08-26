import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home/home.tsx"),
  route("changelog", "routes/home/changelog.tsx"), 
  route("tutorial", "routes/home/tutorial.tsx"), 

    layout("./auth/layout.tsx", [
      route("login", "./auth/login.tsx"),
      route("register", "./auth/register.tsx"),
    ]),

    layout("./protected/layout.tsx", [
      route("rancho", "./protected/home/rancho.tsx"),
      layout("./protected/presence/layout.tsx", [
        route("fiscal", "./protected/presence/presence.tsx"),
      ]),
      layout("./protected/superAdminPanel/layout.tsx", [
        route("superadmin", "./protected/superAdminPanel/superAdminPanel.tsx"),
      ]),
      route("admin", "./protected/adminPanel/adminPanel.tsx"),
    ]),

    // Nova rota API para Power BI
  route("api/rancho", "./routes/apiRancho.tsx"),

] satisfies RouteConfig;