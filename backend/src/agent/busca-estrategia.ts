/**
 * Heurística leve para modo de busca quando o agente escolhe "auto".
 * Lexical para nomes/chaves literais; vetorial para intenção semântica; híbrida no resto.
 * Exportado para testes sem LLM.
 */

export type ModoBuscaTreinador = 'lexical' | 'vetorial' | 'hibrida';

export function resolverModoBuscaAuto(query: string): ModoBuscaTreinador {
  const q = String(query || '').trim();
  if (!q) return 'hibrida';

  const pareceLiteral =
    /\b(mensagens_fluxo|prompt_sistema|orquestracao_texto|ocr_|camadaHumana|instrucaoFormatacao)\b/i.test(q) ||
    /["'`][^"'`]{3,}["'`]/.test(q) ||
    /\bchave\s*[:=]/i.test(q);

  const pareceSemantico =
    /(mais|menos)\s+(amigav|agressiv|formal|caloros|direto|curto|longo|human)/i.test(q) ||
    /(tom|estilo|empatia|urgente|calmo)/i.test(q);

  if (pareceLiteral && !pareceSemantico) return 'lexical';
  if (pareceSemantico && !pareceLiteral) return 'vetorial';
  return 'hibrida';
}

export function resolverModoBusca(
  modo: string | undefined,
  query: string,
): { modoEfetivo: ModoBuscaTreinador; escolhido: string } {
  const pedido = String(modo || 'auto').toLowerCase();
  if (pedido === 'lexical' || pedido === 'vetorial' || pedido === 'hibrida') {
    return { modoEfetivo: pedido, escolhido: pedido };
  }
  const auto = resolverModoBuscaAuto(query);
  return { modoEfetivo: auto, escolhido: 'auto' };
}
