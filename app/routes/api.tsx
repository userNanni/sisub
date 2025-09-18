// api.tsx
import supabase from "../utils/supabase";

// Tipos utilitários
type OrderRule = { column: string; ascending?: boolean | null };

export type LoaderConfig = {
  // Tabela ou view no Supabase
  table: string;
  // String de colunas para o select (ex.: "id, created_at, ...")
  select: string;

  // Coluna de data para filtros via query params
  // Aceita também colunas com nome "data" ou "date" em views
  dateColumn?: string;

  // Tipo da coluna de data (controla como o filtro "date" é aplicado)
  // - "timestamp": aplica janelas do dia (00:00:00 -> 23:59:59.999) em date e em startDate/endDate
  // - "date": usa eq(date) quando "date" for passado e gte/lte para start/end
  dateColumnType?: "timestamp" | "date";

  // Ordenações padrão
  defaultOrder?: OrderRule[];

  // Mapeia query params => nome de coluna para filtros simples
  // Ex.: { unidade: "unidade", refeicao: "refeicao" }
  // - Valor único vira eq
  // - Valor com vírgulas vira in
  // - Também aceita <param>_ilike para ilike (contém)
  mapParams?: Record<string, string>;

  // Limite padrão e máximo (proteção)
  defaultLimit?: number;
  maxLimit?: number;

  // Headers adicionais (Cache-Control, etc.)
  cacheControl?: string;
  corsOrigin?: string;
};

function toInt(v: string | null | undefined, d: number) {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : d;
}

function commaListToArray(v: string) {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Constrói regras de ordenação vindas do parâmetro "order"
// Formato: ?order=col:asc,col2:desc
function parseOrderParam(v: string | null | undefined): OrderRule[] {
  if (!v) return [];
  return v
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [col, dir] = part.split(":").map((s) => s.trim());
      return {
        column: col,
        ascending: dir ? dir.toLowerCase() !== "desc" : true,
      };
    });
}

// Monta intervalos de data/hora para timestamp
function dayBounds(dateStr: string) {
  // Usamos formato ISO sem timezone para evitar deslocamentos
  const start = `${dateStr}T00:00:00.000`;
  const end = `${dateStr}T23:59:59.999`;
  return { start, end };
}

export function createApiLoader(config: LoaderConfig) {
  const {
    table,
    select,
    dateColumn,
    dateColumnType = "timestamp",
    defaultOrder = [],
    mapParams = {},
    defaultLimit = 1000,
    maxLimit = 10000,
    cacheControl = "public, max-age=300",
    corsOrigin = "*",
  } = config;

  return async function loader({ request }: { request: Request }) {
    try {
      // Aceita somente GET
      if (request.method !== "GET") {
        return Response.json(
          { error: "Método não permitido. Use apenas GET." },
          { status: 405 }
        );
      }

      const url = new URL(request.url);
      const sp = url.searchParams;

      // Inicia query
      let query = supabase.from(table).select(select);

      // Limite com proteção
      const limit = Math.min(
        Math.max(1, toInt(sp.get("limit"), defaultLimit)),
        maxLimit
      );
      query = query.limit(limit);

      // Filtros mapeados simples (eq, in, ilike)
      // - ?unidade=1,2,3 => in
      // - ?unidade=1 => eq
      // - ?unidade_ilike=cia => ilike('%cia%')
      for (const [param, column] of Object.entries(mapParams)) {
        const ilikeVal = sp.get(`${param}_ilike`);
        if (ilikeVal) {
          query = query.ilike(column, `%${ilikeVal}%`);
          continue;
        }
        const rawVal = sp.get(param);
        if (!rawVal) continue;
        if (rawVal.includes(",")) {
          const arr = commaListToArray(rawVal);
          if (arr.length > 0) query = query.in(column, arr);
        } else {
          query = query.eq(column, rawVal);
        }
      }

      // Filtro por data
      if (dateColumn) {
        const dateEq = sp.get("date"); // Um único dia
        const startDate = sp.get("startDate"); // Início do intervalo
        const endDate = sp.get("endDate"); // Fim do intervalo

        if (dateEq) {
          if (dateColumnType === "timestamp") {
            const { start, end } = dayBounds(dateEq);
            query = query.gte(dateColumn, start).lte(dateColumn, end);
          } else {
            query = query.eq(dateColumn, dateEq);
          }
        } else {
          if (startDate) {
            if (dateColumnType === "timestamp") {
              const { start } = dayBounds(startDate);
              query = query.gte(dateColumn, start);
            } else {
              query = query.gte(dateColumn, startDate);
            }
          }
          if (endDate) {
            if (dateColumnType === "timestamp") {
              const { end } = dayBounds(endDate);
              query = query.lte(dateColumn, end);
            } else {
              query = query.lte(dateColumn, endDate);
            }
          }
        }
      }

      // Ordenação
      const orderFromParam = parseOrderParam(sp.get("order"));
      const finalOrder = orderFromParam.length ? orderFromParam : defaultOrder;
      for (const ord of finalOrder) {
        if (!ord.column) continue;
        query = query.order(ord.column, { ascending: ord.ascending ?? true });
      }

      // Executa
      const { data: rows, error } = await query;
      if (error) {
        console.error("Erro Supabase:", error);
        return Response.json(
          {
            error: "Erro interno do servidor ao buscar dados",
            details: error.message,
          },
          { status: 500 }
        );
      }

      // Retorno "puro": apenas o array de dados
      return Response.json(rows ?? [], {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": cacheControl,
        },
      });
    } catch (err: any) {
      console.error("Erro crítico no endpoint API:", err);
      return Response.json(
        {
          error: "Erro interno do servidor",
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  };
}

// Action padrão para preflight CORS (OPTIONS)
export async function defaultOptionsAction({ request }: { request: Request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  return Response.json({ error: "Método não permitido" }, { status: 405 });
}
