// apiPresence.tsx
import type { Route } from "./+types/apiPresence";
import { createApiLoader, defaultOptionsAction } from "./api";

export const loader = createApiLoader({
  table: "rancho_presencas_agregado",
  select: "date, unidade, meal, total",
  dateColumn: "date",
  dateColumnType: "date", // normalmente esta coluna é tipo 'date'
  defaultOrder: [
    { column: "date", ascending: false },
    { column: "unidade", ascending: true },
    { column: "meal", ascending: true },
  ],
  mapParams: {
    unidade: "unidade",
    meal: "meal",
    // o filtro de data é via ?date=YYYY-MM-DD ou startDate/endDate
  },
  cacheControl: "public, max-age=300",
});

export const action = defaultOptionsAction;
export type { Route };
