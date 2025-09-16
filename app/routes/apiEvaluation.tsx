import type { Route } from "./+types/apiRancho";
import supabase from "../utils/supabase";

type Row = {
  id: number;
  created_at: string; // ISO
  value: number | null; // smallint pode vir nulo
  question: string | null;
  userId: string | null;
};

export async function loader({ request }: Route.LoaderArgs) {
  try {
    // Apenas método GET
    if (request.method !== "GET") {
      return Response.json(
        { error: "Método não permitido. Use apenas GET." },
        { status: 405 }
      );
    }

    // Buscar dados brutos da nova tabela
    const { data: rows, error } = await supabase
      .from("opinions")
      .select("id, created_at, value, question, userId")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar dados:", error);
      return Response.json(
        {
          error: "Erro interno do servidor ao buscar dados",
          details: error.message,
        },
        { status: 500 }
      );
    }

    const data: Row[] = (rows ?? []).filter(
      (r): r is Row =>
        !!r &&
        typeof r.created_at === "string" &&
        // value pode ser null; question e userId podem ser null
        true
    );

    // Helper para normalizar a data (YYYY-MM-DD, UTC)
    const toDateStr = (iso: string) => {
      const d = new Date(iso);
      // Garantir ISO em UTC e pegar só a parte da data
      return new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
      )
        .toISOString()
        .slice(0, 10);
    };

    // Agregar por dia e pergunta
    type GroupKey = string; // `${date}||${question}`
    type GroupAgg = {
      date: string;
      question: string | null;
      responses_count: number;
      unique_users: number;
      avg_value: number | null;
      min_value: number | null;
      max_value: number | null;
    };

    const groups = new Map<
      GroupKey,
      {
        date: string;
        question: string | null;
        count: number;
        sum: number;
        hasValueCount: number;
        min: number | null;
        max: number | null;
        users: Set<string>;
      }
    >();

    for (const r of data) {
      const date = toDateStr(r.created_at);
      const question = r.question ?? null;
      const key: GroupKey = `${date}||${question ?? ""}`;
      if (!groups.has(key)) {
        groups.set(key, {
          date,
          question,
          count: 0,
          sum: 0,
          hasValueCount: 0,
          min: null,
          max: null,
          users: new Set<string>(),
        });
      }
      const g = groups.get(key)!;
      g.count += 1;

      if (typeof r.value === "number") {
        g.sum += r.value;
        g.hasValueCount += 1;
        g.min = g.min === null ? r.value : Math.min(g.min, r.value);
        g.max = g.max === null ? r.value : Math.max(g.max, r.value);
      }

      if (r.userId) g.users.add(r.userId);
    }

    const aggregated: GroupAgg[] = Array.from(groups.values())
      .map((g) => ({
        date: g.date,
        question: g.question,
        responses_count: g.count,
        unique_users: g.users.size,
        avg_value:
          g.hasValueCount > 0
            ? Number((g.sum / g.hasValueCount).toFixed(2))
            : null,
        min_value: g.min,
        max_value: g.max,
      }))
      .sort((a, b) => {
        // Ordena por data desc, depois question asc (nulls last)
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        const qa = a.question ?? "\uffff";
        const qb = b.question ?? "\uffff";
        return qa.localeCompare(qb);
      });

    // Estatísticas gerais
    const totalRecords = data.length;
    const totalUsers = new Set(data.map((r) => r.userId).filter(Boolean)).size;
    const totalQuestions = new Set(data.map((r) => r.question).filter(Boolean))
      .size;
    const totalDays = new Set(data.map((r) => toDateStr(r.created_at))).size;

    const values = data
      .map((r) => r.value)
      .filter((v): v is number => typeof v === "number");
    const avgOverall = values.length
      ? Number((values.reduce((s, n) => s + n, 0) / values.length).toFixed(2))
      : null;

    // Intervalo de datas
    const dates = data.map((r) => toDateStr(r.created_at));
    const minDate = dates.length
      ? dates.reduce((a, b) => (a < b ? a : b))
      : null;
    const maxDate = dates.length
      ? dates.reduce((a, b) => (a > b ? a : b))
      : null;

    return Response.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          total_records: totalRecords,
          total_users: totalUsers,
          total_questions: totalQuestions,
          total_days: totalDays,
          average_value_overall: avgOverall,
          date_range: {
            start: minDate,
            end: maxDate,
          },
        },
        // Dados agregados por dia e pergunta (ótimo para Power BI)
        data: aggregated,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "public, max-age=300",
        },
      }
    );
  } catch (err) {
    console.error("Erro crítico no endpoint API:", err);
    return Response.json(
      {
        error: "Erro interno do servidor",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Função para lidar com OPTIONS (preflight CORS)
export async function action({ request }: Route.ActionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  return Response.json({ error: "Método não permitido" }, { status: 405 });
}
