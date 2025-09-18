// apiPresences.tsx
import type { Route } from "./+types/apiWhereWhoWhen";
import { createApiLoader, defaultOptionsAction } from "./api";

export const loader = createApiLoader({
  table: "rancho_presencas",
  select: "user_id, date, unidade", // dados solicitados: quem, quando, onde
  dateColumn: "date",
  dateColumnType: "date",
  defaultOrder: [
    { column: "date", ascending: false },
    { column: "unidade", ascending: true },
    { column: "user_id", ascending: true },
  ],
  // Filtros por query params
  mapParams: {
    user_id: "user_id", // ?user_id=uuid ou ?user_id=uuid1,uuid2
    unidade: "unidade", // ?unidade=1CIA ou ?unidade=1CIA,2CIA
    meal: "meal", // opcional: filtrar por refeição mesmo não retornando no select
    // também funciona: ?unidade_ilike=cia para busca parcial
  },
  cacheControl: "public, max-age=300",
});

// Suporte a preflight CORS (OPTIONS)
export const action = defaultOptionsAction;
export type { Route };
