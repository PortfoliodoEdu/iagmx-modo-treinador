/**
 * Heuristica leve para modo de busca quando o agente escolhe "auto".
 * Lexical para nomes/chaves literais; vetorial para intencao semantica; hibrida no resto.
 * Exportado para testes sem LLM.
 */
import { normalizarTextoPolitica } from './texto-politica.js';

export type ModoBuscaTreinador = 'lexical' | 'vetorial' | 'hibrida';

const MODOS_VALIDOS = new Set<ModoBuscaTreinador>(['lexical', 'vetorial', 'hibrida']);

export function resolverModoBuscaAuto(query: string): ModoBuscaTreinador {
  const q = normalizarTextoPolitica(query);
  if (!q) return 'hibrida';

  const pareceLiteral =
    /\b(mensagens_fluxo|prompt_sistema|orquestracao_texto|ocr_[a-z0-9_]+|camadahumana|instrucaoformatacao)\b/i.test(
      q,
    ) ||
    /["'`][^"'`]{3,}["'`]/.test(query) ||
    /\bchave\s*[:=]/i.test(q);

  const pareceSemantico =
    /(mais|menos)\s+(amigav|agressiv|formal|caloros|direto|curto|longo|human|educad)/i.test(q) ||
    /(tom|estilo|empatia|urgente|calmo)/i.test(q);

  if (pareceLiteral && !pareceSemantico) return 'lexical';
  if (pareceSemantico && !pareceLiteral) return 'vetorial';
  return 'hibrida';
}

export function resolverModoBusca(
  modo: string | undefined,
  query: string,
): { modoEfetivo: ModoBuscaTreinador; escolhido: string } {
  const pedido = normalizarTextoPolitica(String(modo || 'auto'));
  if (MODOS_VALIDOS.has(pedido as ModoBuscaTreinador)) {
    return { modoEfetivo: pedido as ModoBuscaTreinador, escolhido: pedido };
  }
  const auto = resolverModoBuscaAuto(query);
  return { modoEfetivo: auto, escolhido: pedido || 'auto' };
}

/** Limite seguro para buscas (evita NaN/Infinity/negativo). */
export function sanitizarLimiteBusca(limite: unknown, padrao = 8, max = 30): number {
  const n = Number(limite);
  if (!Number.isFinite(n) || n <= 0) return padrao;
  return Math.min(Math.floor(n), max);
}
