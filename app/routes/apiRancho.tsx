// apiRancho.tsx
import type { Route } from "./+types/apiRancho";
import { createApiLoader, defaultOptionsAction } from "./api";

export const loader = createApiLoader({
  table: "rancho_agregado",
  select: "data, unidade, refeicao, total_vai_comer",
  dateColumn: "data",
  dateColumnType: "date",
  defaultOrder: [
    { column: "data", ascending: false },
    { column: "unidade", ascending: true },
    { column: "refeicao", ascending: true },
  ],
  mapParams: {
    unidade: "unidade",
    refeicao: "refeicao",
  },
  cacheControl: "public, max-age=300",
});

export const action = defaultOptionsAction;
export type { Route };
