/**
 * Combina busca vetorial e lexical para recuperar contexto do treinador.
 * Deduplica os trechos para a proposta ficar enxuta e confirmavel.
 * Mantem fallback deterministico quando a camada vetorial nao responder.
 */
import {
  buscarTrechosRelacionadosTreinamento,
  type TrechoTreinamentoRelacionado,
} from './treinamento-config-busca.js';
import { buscarTrechosVetoriaisTreinamento } from './treinamento-config-vetorial.js';
import { mesclarTrechosTreinamento } from '../agent/mescla-trechos.js';

/** Compativel com testes antigos. */
export function mesclarTrechosTreinamentoParaTeste(
  vetorial: TrechoTreinamentoRelacionado[],
  lexical: TrechoTreinamentoRelacionado[],
  limite = 8,
): TrechoTreinamentoRelacionado[] {
  return mesclarTrechosTreinamento(vetorial, lexical, limite) as TrechoTreinamentoRelacionado[];
}

export async function recuperarTrechosTreinamento(
  pedido: string,
  limite = 8,
): Promise<TrechoTreinamentoRelacionado[]> {
  const [vetorial, lexical] = await Promise.all([
    buscarTrechosVetoriaisTreinamento(pedido, limite).catch(() => []),
    buscarTrechosRelacionadosTreinamento(pedido, limite).catch(() => []),
  ]);
  return mesclarTrechosTreinamentoParaTeste(vetorial, lexical, limite);
}
