/**
 * Mescla pura de trechos vetoriais + lexicais do treinador.
 * Sem IO — testavel isoladamente e reusada pela recuperacao.
 */
export type TrechoMesclavel = {
  alvo: string;
  chave: string | null;
  rotulo: string;
  texto: string;
  score: number;
  origemBusca: 'lexical' | 'vetorial' | 'fallback';
};

function chaveTrecho(item: TrechoMesclavel): string {
  return `${item.alvo}|${item.chave || ''}|${item.texto}`;
}

export function mesclarTrechosTreinamento(
  vetorial: TrechoMesclavel[],
  lexical: TrechoMesclavel[],
  limite = 8,
): TrechoMesclavel[] {
  const lim = Number.isFinite(limite) && limite > 0 ? Math.floor(limite) : 0;
  const itens = [...vetorial, ...lexical];
  const vistos = new Set<string>();
  const deduplicados = itens.filter((item) => {
    const chave = chaveTrecho(item);
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });

  return deduplicados
    .sort((a, b) => {
      const pesoA = a.origemBusca === 'vetorial' ? 1 : 0;
      const pesoB = b.origemBusca === 'vetorial' ? 1 : 0;
      return pesoB - pesoA || b.score - a.score || a.rotulo.localeCompare(b.rotulo);
    })
    .slice(0, lim);
}
