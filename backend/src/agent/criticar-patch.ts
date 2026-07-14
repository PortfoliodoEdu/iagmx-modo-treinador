/**
 * Critica uma proposta de patch antes de mostrar como pronta ao usuario.
 * Detecta conflito, replace cego, alvo vazio e operacoes demais rasas.
 * Usado apos propor_patch e pela tool criticar_patch.
 */
import type { PatchTreinamentoAplicavel } from '../servicos/treinamento-config-alvos.js';
import type { PreviewPatchTreinamento } from '../servicos/treinamento-config-lote.js';

export type CriticaPatch = {
  aprovadoParaPerguntar: boolean;
  nota: number;
  problemas: string[];
  sugestoes: string[];
  resumo: string;
};

function corte(s: string, n = 120): string {
  const t = String(s || '').trim();
  return t.length <= n ? t : `${t.slice(0, n)}...`;
}

export function criticarOperacoesPatch(opts: {
  pedido: string;
  operacoes: PatchTreinamentoAplicavel[];
  previews?: PreviewPatchTreinamento[];
}): CriticaPatch {
  const problemas: string[] = [];
  const sugestoes: string[] = [];
  const ops = opts.operacoes || [];

  if (!ops.length) {
    return {
      aprovadoParaPerguntar: false,
      nota: 0,
      problemas: ['Nenhuma operacao no patch.'],
      sugestoes: ['Refaca a proposta com alvo e trecho claros.'],
      resumo: 'Patch vazio — nao pergunte confirmacao.',
    };
  }

  if (ops.length > 6) {
    problemas.push(`Lote grande demais (${ops.length} ops). Risco de edicao rasa/espalhada.`);
    sugestoes.push('Reduza para os 3 alvos de maior impacto e explique o restante depois.');
  }

  for (const op of ops) {
    if (!op.textoProposto?.trim()) {
      problemas.push(`Operacao em ${op.alvo} sem textoProposto.`);
    }
    if (op.operacao === 'replace' && !op.trechoAtual?.trim()) {
      problemas.push(
        `Replace em ${op.alvo}${op.chave ? '.' + op.chave : ''} sem trechoAtual — pode sobrescrever o alvo inteiro.`,
      );
      sugestoes.push('Exija trechoAtual ou use append/prepend pontual.');
    }
    if (op.operacao === 'append' && op.textoProposto.trim().length < 8) {
      problemas.push(`Append muito curto em ${op.alvo}.`);
    }
    if (op.alvo === 'prompt_sistema' && op.operacao === 'replace' && !op.trechoAtual) {
      problemas.push('Replace total de prompt_sistema e cirurgia extrema — confirme com o usuario explicitamente.');
    }
  }

  for (const prev of opts.previews || []) {
    if (prev.antes === prev.depois) {
      problemas.push(`Preview sem efeito em ${prev.alvo}${prev.chave ? '.' + prev.chave : ''}.`);
    }
    if (prev.depois.length > prev.antes.length * 3 + 500) {
      problemas.push(`Expansao agressiva em ${prev.alvo} (${prev.antes.length}→${prev.depois.length} chars).`);
      sugestoes.push('Prefira replace local em vez de inchaco.');
    }
  }

  const pedido = String(opts.pedido || '').toLowerCase();
  if (/ocr/.test(pedido) && !ops.some((o) => String(o.alvo).startsWith('ocr'))) {
    problemas.push('Pedido fala em OCR mas nenhuma operacao toca alvos OCR.');
  }
  if (/mensagem|boas\s*vind/.test(pedido) && !ops.some((o) => o.alvo === 'mensagens_fluxo')) {
    sugestoes.push('Considere mensagens_fluxo se o pedido era sobre mensagem ao usuario.');
  }

  const nota = Math.max(0, 10 - problemas.length * 2);
  const aprovadoParaPerguntar = problemas.filter((p) => /sem textoProposto|Patch vazio|sem efeito/.test(p)).length === 0
    && ops.length > 0;

  return {
    aprovadoParaPerguntar,
    nota,
    problemas,
    sugestoes,
    resumo: problemas.length
      ? `Critica: nota ${nota}/10. Problemas: ${problemas.map(corte).join(' | ')}`
      : `Critica: nota ${nota}/10. Patch coerente o bastante para perguntar confirmacao.`,
  };
}
