/**
 * Testes do cerebro profundo: politica patch vs overlay, critica de patch, fluxo tools.
 * Sem Postgres — funcoes puras + mocks.
 */
import assert from 'node:assert/strict';
import { decidirTipoEdicao } from '../../backend/src/agent/politica-edicao.js';
import { criticarOperacoesPatch } from '../../backend/src/agent/criticar-patch.js';
import { MAX_TURNOS_AGENTE, PROMPT_SISTEMA_TREINADOR_AGENTE } from '../../backend/src/agent/treinador-system-prompt.js';
import { TOOLS_TREINADOR } from '../../backend/src/agent/tool-defs.js';

function ok(n: string) {
  console.log(`ok — ${n}`);
}

// politica
assert.equal(decidirTipoEdicao('Crie integração com Asana').tipo, 'fora_escopo');
ok('politica fora');

assert.equal(
  decidirTipoEdicao('Muda a mensagem de boas vindas para algo informal').tipo,
  'patch_config',
);
ok('politica patch mensagem');

assert.equal(
  decidirTipoEdicao('Sempre ofereça frete de retorno quando a carga for de retorno').tipo,
  'aprendizado_overlay',
);
ok('politica aprendizado');

assert.equal(decidirTipoEdicao('Quais regras você está usando?').tipo, 'pergunta');
ok('politica pergunta');

assert.equal(
  decidirTipoEdicao('Corrige o prompt_sistema e sempre agradeça duas vezes').tipo,
  'hibrido',
);
ok('politica hibrido');

// critica
const criticaRuim = criticarOperacoesPatch({
  pedido: 'mude ocr',
  operacoes: [
    {
      alvo: 'prompt_sistema',
      chave: null,
      operacao: 'replace',
      trechoAtual: null,
      textoProposto: 'tudo novo',
    },
  ],
  previews: [{ alvo: 'prompt_sistema', chave: null, antes: 'a', depois: 'a' }],
});
assert.equal(criticaRuim.aprovadoParaPerguntar, false);
assert.ok(criticaRuim.problemas.length >= 1);
ok('critica rejeita replace cego + sem efeito');

const criticaOk = criticarOperacoesPatch({
  pedido: 'torne boas vindas mais curtas',
  operacoes: [
    {
      alvo: 'mensagens_fluxo',
      chave: 'boasVindas',
      operacao: 'replace',
      trechoAtual: 'Ola motorista',
      textoProposto: 'Oi! Beleza?',
    },
  ],
  previews: [
    {
      alvo: 'mensagens_fluxo',
      chave: 'boasVindas',
      antes: 'Ola motorista',
      depois: 'Oi! Beleza?',
    },
  ],
});
assert.equal(criticaOk.aprovadoParaPerguntar, true);
assert.ok(criticaOk.nota >= 6);
ok('critica aceita replace local');

// tools + prompt
assert.ok(TOOLS_TREINADOR.some((t) => t.function.name === 'ler_alvo_completo'));
assert.ok(TOOLS_TREINADOR.some((t) => t.function.name === 'decidir_tipo_edicao'));
assert.ok(TOOLS_TREINADOR.some((t) => t.function.name === 'criticar_patch'));
assert.ok(PROMPT_SISTEMA_TREINADOR_AGENTE.includes('modo_busca'));
assert.ok(PROMPT_SISTEMA_TREINADOR_AGENTE.includes('ler_alvo_completo'));
assert.ok(MAX_TURNOS_AGENTE >= 8);
ok('tools e prompt alinhados');

console.log('todos os testes de cerebro profundo passaram');
