// hooks/useUnidades.ts
import { useState, useEffect } from 'react';
import supabase from '@/utils/supabase'; // Ajuste o caminho para seu cliente supabase
import { FALLBACK_UNIDADES } from '@/components/constants/rancho';

// Define o tipo para uma única unidade, para garantir a consistência
export interface Unidade {
  value: string;
  label: string;
}

export const useUnidades = () => {
  // Inicia o estado com a lista de fallback
  const [unidades, setUnidades] = useState<readonly Unidade[]>(FALLBACK_UNIDADES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnidades = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Busca na tabela 'unidades_disponiveis'
        // Assumindo que as colunas se chamam 'value' e 'label'
        const { data, error: supabaseError } = await supabase
          .from('unidades_disponiveis')
          .select('value, label')
          .order('label', { ascending: true }); // Ordenar por nome é uma boa prática

        if (supabaseError) {
          throw supabaseError;
        }

        // Se a busca retornar dados, atualiza o estado.
        // Se não, o estado continua com o fallback.
        if (data && data.length > 0) {
          setUnidades(data);
        }

      } catch (err) {
        console.error("Erro ao buscar unidades:", err);
        setError("Não foi possível carregar a lista de unidades.");
        // Em caso de erro, o estado 'unidades' já contém o fallback, então nada precisa ser feito.
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnidades();
  }, [JSON.stringify(unidades)]); 

  return { unidades, isLoading, error };
};