import type { Route } from "./+types/apiRancho";
import supabase from "@/utils/supabase";

export async function loader({ request }: Route.LoaderArgs) {
  try {
    // Verificar se é método GET
    if (request.method !== 'GET') {
      return Response.json(
        { error: 'Método não permitido. Use apenas GET.' },
        { status: 405 }
      );
    }

    // Buscar dados da view agregada (muito mais eficiente)
    const { data: ranchoData, error } = await supabase
      .from("rancho_agregado")
      .select(`
        data,
        unidade,
        refeicao,
        total_vai_comer
      `)
      .order("data", { ascending: true })
      .order("unidade", { ascending: true })
      .order("refeicao", { ascending: true });

    if (error) {
      console.error("Erro ao buscar dados do rancho:", error);
      return Response.json(
        { 
          error: "Erro interno do servidor ao buscar dados",
          details: error.message 
        },
        { status: 500 }
      );
    }

    // Calcular estatísticas adicionais (agora muito mais rápido)
    const totalRecords = ranchoData?.length || 0;
    const totalPessoasComendo = ranchoData?.reduce((sum, item) => sum + item.total_vai_comer, 0) || 0;
    const totalDias = new Set(ranchoData?.map(item => item.data)).size;
    const totalUnidades = new Set(ranchoData?.map(item => item.unidade)).size;

    // Retornar dados agregados com metadados úteis para Power BI
    return Response.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          total_records: totalRecords,
          total_pessoas_comendo: totalPessoasComendo,
          total_dias: totalDias,
          total_unidades: totalUnidades,
          total_refeicoes_servidas: totalPessoasComendo
        },
        data: ranchoData || []
      },
      { 
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "public, max-age=300" // Cache de 5 minutos
        }
      }
    );

  } catch (err) {
    console.error("Erro crítico no endpoint API:", err);
    return Response.json(
      { 
        error: "Erro interno do servidor",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Função para lidar com OPTIONS (preflight CORS)
export async function action({ request }: Route.ActionArgs) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  return Response.json(
    { error: 'Método não permitido' },
    { status: 405 }
  );
}