/**
 * Normalizacao de texto para politicas do treinador (acentos/caixa).
 * Evita falhas em "integração", "você", "educação" etc.
 * Usado por escopo.ts e busca-estrategia.ts.
 */
export function normalizarTextoPolitica(texto: string): string {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
