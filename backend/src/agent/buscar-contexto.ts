/**
 * Busca de contexto controlada pelo agente (lexical/vetorial/hibrida/auto).
 * Usada por tool-runner e por propor_patch para nao rebuscar às cegas.
 * Relacionado: busca-estrategia.ts, treinamento-config-busca/vetorial.
 */
import { resolverModoBusca, sanitizarLimiteBusca } from './busca-estrategia.js';
import { buscarTrechosRelacionadosTreinamento } from '../servicos/treinamento-config-busca.js';
import { buscarTrechosVetoriaisTreinamento } from '../servicos/treinamento-config-vetorial.js';
import { mesclarTrechosTreinamento } from './mescla-trechos.js';
import type { TrechoTreinamentoRelacionado } from '../servicos/treinamento-config-busca.js';

export async function buscarContextoTreinador(opts: {
  query: string;
  modo?: string;
  limite?: unknown;
}): Promise<{
  modoPedido: string;
  modoEfetivo: string;
  total: number;
  trechos: TrechoTreinamentoRelacionado[];
}> {
  const query = String(opts.query || '').trim();
  const { modoEfetivo, escolhido } = resolverModoBusca(opts.modo, query);
  const limiteSeguro = sanitizarLimiteBusca(opts.limite);
  let trechos: TrechoTreinamentoRelacionado[] = [];

  if (modoEfetivo === 'lexical') {
    trechos = await buscarTrechosRelacionadosTreinamento(query, limiteSeguro);
  } else if (modoEfetivo === 'vetorial') {
    trechos = await buscarTrechosVetoriaisTreinamento(query, limiteSeguro);
  } else {
    const [vetorial, lexical] = await Promise.all([
      buscarTrechosVetoriaisTreinamento(query, limiteSeguro).catch(() => []),
      buscarTrechosRelacionadosTreinamento(query, limiteSeguro).catch(() => []),
    ]);
    trechos = mesclarTrechosTreinamento(vetorial, lexical, limiteSeguro) as TrechoTreinamentoRelacionado[];
  }

  return {
    modoPedido: escolhido,
    modoEfetivo,
    total: trechos.length,
    trechos,
  };
}
