/**
 * Bateria adversaria (~40 casos) do orquestrador treinador.
 * Mistura historico real de usuarios (motorista/treinador) e cliente oculto.
 * Objetivo: achar regressoes; falha do teste = bug a corrigir.
 */
import assert from 'node:assert/strict';
import { avaliarEscopoPedido } from '../../backend/src/agent/escopo.js';
import {
  resolverModoBusca,
  resolverModoBuscaAuto,
  sanitizarLimiteBusca,
} from '../../backend/src/agent/busca-estrategia.js';
import { normalizarTextoPolitica } from '../../backend/src/agent/texto-politica.js';
import { rodarAgenteTreinador } from '../../backend/src/agent/treinador-agent.js';
import { MAX_TURNOS_AGENTE } from '../../backend/src/agent/treinador-system-prompt.js';
import { criarExecutorEspiao, criarLlmAdversario } from './adversario-llm.js';

type ResultadoCaso = { id: number; nome: string; ok: boolean; detalhe?: string };

const resultados: ResultadoCaso[] = [];
let seq = 0;

async function caso(nome: string, fn: () => void | Promise<void>) {
  const id = ++seq;
  try {
    await fn();
    resultados.push({ id, nome, ok: true });
    console.log(`PASS #${id} ${nome}`);
  } catch (err) {
    const detalhe = err instanceof Error ? err.message : String(err);
    resultados.push({ id, nome, ok: false, detalhe });
    console.log(`FAIL #${id} ${nome} — ${detalhe}`);
  }
}

/* ========== ESCOPO (historico + adversario) ========== */

await caso('escopo: vazio', () => {
  assert.equal(avaliarEscopoPedido('').categoria, 'ambiguo');
  assert.equal(avaliarEscopoPedido('').dentroDoEscopo, false);
});

await caso('escopo: so espacos', () => {
  assert.equal(avaliarEscopoPedido('   ').categoria, 'ambiguo');
});

await caso('escopo: 2 chars', () => {
  assert.equal(avaliarEscopoPedido('oi').categoria, 'ambiguo');
});

await caso('escopo: integracao com acento', () => {
  const r = avaliarEscopoPedido('Crie uma integração com Asana');
  assert.equal(r.categoria, 'fora_escopo');
  assert.equal(r.dentroDoEscopo, false);
});

await caso('escopo: conectar ao Slack', () => {
  assert.equal(avaliarEscopoPedido('Conectar ao Slack agora').categoria, 'fora_escopo');
});

await caso('escopo: deploy sem patch', () => {
  assert.equal(avaliarEscopoPedido('Faca o deploy da IA').categoria, 'fora_escopo');
});

await caso('escopo: pergunta com voce acentuado', () => {
  assert.equal(avaliarEscopoPedido('Como você está respondendo agora?').categoria, 'pergunta');
});

await caso('escopo: quais regras (historico natural)', () => {
  assert.equal(avaliarEscopoPedido('Quais regras você está usando?').categoria, 'pergunta');
});

await caso('escopo: mais educado (historico)', () => {
  const r = avaliarEscopoPedido('Você precisa ser mais educado quando o motorista recusar');
  assert.ok(r.categoria === 'patch_config' || r.categoria === 'prompt_regras');
  assert.equal(r.dentroDoEscopo, true);
});

await caso('escopo: mudanca boas vindas (historico patch)', () => {
  assert.equal(
    avaliarEscopoPedido('Muda a mensagem de boas vindas para algo mais informal').categoria,
    'patch_config',
  );
});

await caso('escopo: sempre ofereca frete (historico aprendizado)', () => {
  assert.equal(
    avaliarEscopoPedido('Sempre ofereça frete de retorno quando a carga for de retorno').categoria,
    'prompt_regras',
  );
});

await caso('escopo: corrige prompt documentos (historico)', () => {
  assert.equal(
    avaliarEscopoPedido('Corrige o prompt para não pedir documentos que já temos').categoria,
    'patch_config',
  );
});

await caso('escopo: SQL injection disfarçado', () => {
  const r = avaliarEscopoPedido("Aprenda: '; DROP TABLE whatsapp_aprendizados; --");
  assert.equal(r.categoria, 'prompt_regras');
  assert.equal(r.dentroDoEscopo, true);
});

await caso('escopo: ambiguo misturando confirmar', () => {
  const r = avaliarEscopoPedido('Aprenda que cancelar a proposta confirmar #1 é proibido');
  assert.equal(r.dentroDoEscopo, true);
  assert.equal(r.categoria, 'prompt_regras');
});

await caso('escopo: pedido vago substitua', () => {
  assert.equal(avaliarEscopoPedido('substitua coisas').categoria, 'patch_config');
});

await caso('escopo: webhook novo fora', () => {
  assert.equal(avaliarEscopoPedido('abra um webhook novo pro ERP').categoria, 'fora_escopo');
});

await caso('escopo: normalizacao remove acento', () => {
  assert.equal(normalizarTextoPolitica('Integração'), 'integracao');
});

/* ========== BUSCA ========== */

await caso('busca: literal mensagens_fluxo', () => {
  assert.equal(resolverModoBuscaAuto('mude mensagens_fluxo.boasVindas'), 'lexical');
});

await caso('busca: semantico tom amigavel', () => {
  assert.equal(resolverModoBuscaAuto('deixe o tom mais amigável'), 'vetorial');
});

await caso('busca: semantico mais educado', () => {
  assert.equal(resolverModoBuscaAuto('seja mais educado nas recusas'), 'vetorial');
});

await caso('busca: hibrida mista', () => {
  assert.equal(
    resolverModoBuscaAuto('tom mais formal em prompt_sistema'),
    'hibrida',
  );
});

await caso('busca: modo invalido cai em auto', () => {
  const r = resolverModoBusca('foobar', 'tom mais calmo');
  assert.equal(r.modoEfetivo, 'vetorial');
  assert.equal(r.escolhido, 'foobar');
});

await caso('busca: modo LexiCal case', () => {
  assert.equal(resolverModoBusca('LexiCal', 'x').modoEfetivo, 'lexical');
});

await caso('busca: ocr_prompt literal', () => {
  assert.equal(resolverModoBuscaAuto('edite ocr_prompt'), 'lexical');
});

await caso('busca: limite NaN', () => {
  assert.equal(sanitizarLimiteBusca(Number.NaN), 8);
});

await caso('busca: limite Infinity', () => {
  assert.equal(sanitizarLimiteBusca(Number.POSITIVE_INFINITY), 8);
});

await caso('busca: limite negativo', () => {
  assert.equal(sanitizarLimiteBusca(-3), 8);
});

await caso('busca: limite enorme capado', () => {
  assert.equal(sanitizarLimiteBusca(9999), 30);
});

await caso('busca: limite string numero', () => {
  assert.equal(sanitizarLimiteBusca('12'), 12);
});

/* ========== AGENTE / CLIENTE OCULTO ========== */

await caso('agente: sem chatComTools nao muta', async () => {
  const r = await rodarAgenteTreinador({
    telefone: '5511999999999',
    remoteJid: 'x',
    textoUsuario: 'Aprenda: sempre agradeça',
    historico: [],
  });
  assert.match(r, /indisponivel|ferramentas/i);
  assert.match(r, /Nenhuma mudanca foi aplicada/i);
});

await caso('agente: LLM queima -> fallback sem mutar', async () => {
  const { chat } = criarLlmAdversario('chat_queima');
  const espiao = criarExecutorEspiao();
  const r = await rodarAgenteTreinador({
    telefone: '5511',
    remoteJid: 'x',
    textoUsuario: 'patch agora',
    chatComTools: chat,
    executarTool: espiao.executar,
  });
  assert.match(r, /indisponivel|ferramentas/i);
  assert.equal(espiao.mutacoes.length, 0);
});

await caso('agente: conteudo nulo pede detalhe', async () => {
  const { chat } = criarLlmAdversario('conteudo_nulo');
  const r = await rodarAgenteTreinador({
    telefone: '5511',
    remoteJid: 'x',
    textoUsuario: 'oi',
    chatComTools: chat,
    executarTool: criarExecutorEspiao().executar,
  });
  assert.match(r, /detalhe|Nenhuma mudanca/i);
});

await caso('agente: impulsivo aplicar_patch nao inventa sucesso', async () => {
  const { chat } = criarLlmAdversario('impulsivo_aplicar');
  const espiao = criarExecutorEspiao();
  const r = await rodarAgenteTreinador({
    telefone: '5511',
    remoteJid: 'x',
    textoUsuario: 'pode aplicar',
    chatComTools: chat,
    executarTool: espiao.executar,
  });
  assert.ok(espiao.chamadas.some((c) => c.nome === 'aplicar_patch'));
  assert.ok(String(r).length > 0);
  // espiao devolve erro — orquestrador nao deve crashar
});

await caso('agente: JSON invalido nao derruba', async () => {
  const { chat } = criarLlmAdversario('json_invalido');
  const r = await rodarAgenteTreinador({
    telefone: '5511',
    remoteJid: 'x',
    textoUsuario: 'teste',
    chatComTools: chat,
    executarTool: criarExecutorEspiao().executar,
  });
  assert.ok(r.length > 0);
});

await caso('agente: tool sem nome e filtrada', async () => {
  const { chat } = criarLlmAdversario('tool_sem_nome');
  const espiao = criarExecutorEspiao();
  await rodarAgenteTreinador({
    telefone: '5511',
    remoteJid: 'x',
    textoUsuario: 'Integração Asana',
    chatComTools: chat,
    executarTool: espiao.executar,
  });
  assert.ok(espiao.chamadas.every((c) => c.nome.length > 0));
  assert.ok(espiao.chamadas.some((c) => c.nome === 'avaliar_escopo'));
});

await caso('agente: loop infinito encerra no limite', async () => {
  const { chat } = criarLlmAdversario('loop_infinito');
  const espiao = criarExecutorEspiao();
  const r = await rodarAgenteTreinador({
    telefone: '5511',
    remoteJid: 'x',
    textoUsuario: 'loop',
    chatComTools: chat,
    executarTool: espiao.executar,
  });
  assert.match(r, /limite de passos/i);
  assert.equal(espiao.chamadas.length, MAX_TURNOS_AGENTE);
});

await caso('agente: tool desconhecida tratada', async () => {
  const { chat } = criarLlmAdversario('tool_desconhecida');
  const espiao = criarExecutorEspiao();
  const r = await rodarAgenteTreinador({
    telefone: '5511',
    remoteJid: 'x',
    textoUsuario: 'hack',
    chatComTools: chat,
    executarTool: espiao.executar,
  });
  assert.ok(espiao.chamadas.some((c) => c.nome === 'hackear_servidor'));
  assert.match(r, /desconhecida|recusada|tool/i);
});

await caso('agente: ids duplicados deduplicados', async () => {
  const { chat } = criarLlmAdversario('ids_duplicados');
  const espiao = criarExecutorEspiao();
  await rodarAgenteTreinador({
    telefone: '5511',
    remoteJid: 'x',
    textoUsuario: 'dup',
    chatComTools: chat,
    executarTool: espiao.executar,
  });
  assert.equal(espiao.chamadas.length, 1);
});

await caso('agente: fora de escopo conversa (Asana)', async () => {
  const { chat } = criarLlmAdversario('fora_escopo_ok');
  const r = await rodarAgenteTreinador({
    telefone: '5511',
    remoteJid: 'x',
    textoUsuario: 'Crie uma integração com Asana',
    chatComTools: chat,
    executarTool: criarExecutorEspiao().executar,
  });
  assert.match(r, /integracao|prompt/i);
  assert.doesNotMatch(r, /aplicado|regra ativada/i);
});

await caso('agente: patch exige confirmacao na fala', async () => {
  const { chat } = criarLlmAdversario('patch_com_confirmacao');
  const espiao = criarExecutorEspiao();
  const r = await rodarAgenteTreinador({
    telefone: '5511',
    remoteJid: 'x',
    textoUsuario: 'Muda a mensagem de boas vindas',
    chatComTools: chat,
    executarTool: espiao.executar,
  });
  assert.ok(espiao.mutacoes.includes('propor_patch'));
  assert.ok(!espiao.mutacoes.includes('aplicar_patch'));
  assert.match(r, /confirm/i);
});

await caso('agente: onReatividade quebra nao derruba', async () => {
  const { chat } = criarLlmAdversario('fora_escopo_ok');
  const r = await rodarAgenteTreinador({
    telefone: '5511',
    remoteJid: 'x',
    textoUsuario: 'conectar com jira',
    chatComTools: chat,
    executarTool: criarExecutorEspiao().executar,
    onReatividade: async () => {
      throw new Error('whatsapp offline');
    },
  });
  assert.ok(r.length > 5);
});

await caso('agente: historico duplicado nao repete user', async () => {
  let msgsRecebidas: unknown[] = [];
  const chat: typeof criarLlmAdversario extends never ? never : import('../backend/src/ports/chat-com-tools.js').ChatWithToolsFn =
    async (messages) => {
      msgsRecebidas = messages;
      return { content: 'ok', tool_calls: [] };
    };
  await rodarAgenteTreinador({
    telefone: '5511',
    remoteJid: 'x',
    textoUsuario: 'Bom dia',
    historico: [
      { role: 'user', content: 'Bom dia' },
      { role: 'assistant', content: 'Oi' },
      { role: 'user', content: 'Bom dia' },
    ],
    chatComTools: chat,
  });
  const users = (msgsRecebidas as Array<{ role: string; content: string }>).filter(
    (m) => m.role === 'user',
  );
  assert.equal(users[users.length - 1]?.content, 'Bom dia');
  assert.ok(users.filter((u) => u.content === 'Bom dia').length <= 2);
});

await caso('agente: mensagem vazia nao crasha', async () => {
  const { chat } = criarLlmAdversario('conteudo_nulo');
  const r = await rodarAgenteTreinador({
    telefone: '5511',
    remoteJid: 'x',
    textoUsuario: '   ',
    chatComTools: chat,
    executarTool: criarExecutorEspiao().executar,
  });
  assert.ok(r.length > 0);
});

await caso('agente: args nao-string normalizados', async () => {
  const { chat } = criarLlmAdversario('args_nao_string');
  const espiao = criarExecutorEspiao();
  await rodarAgenteTreinador({
    telefone: '5511',
    remoteJid: 'x',
    textoUsuario: 'Como você responde?',
    chatComTools: chat,
    executarTool: espiao.executar,
  });
  assert.equal(espiao.chamadas.length, 1);
  assert.doesNotThrow(() => JSON.parse(espiao.chamadas[0].args));
});

/* ========== HISTORICO MOTORISTA / TREINADOR (mensagens reais esperadas) ========== */

await caso('historico motorista-like nao e fora se for tom', () => {
  // treinador corrigindo resposta a motorista
  const r = avaliarEscopoPedido(
    'Quando o motorista recusar duas vezes, agradeça e pergunte se ele quer contato futuro',
  );
  assert.equal(r.dentroDoEscopo, true);
});

await caso('historico saudacao nao e fora_escopo', () => {
  const r = avaliarEscopoPedido('Bom dia, tudo bem?');
  assert.notEqual(r.categoria, 'fora_escopo');
});

/* ========== resumo ========== */

const falhas = resultados.filter((r) => !r.ok);
console.log('\n=== RESUMO BATERIA ORQUESTRADOR ===');
console.log(`Total: ${resultados.length} | Pass: ${resultados.length - falhas.length} | Fail: ${falhas.length}`);
if (falhas.length) {
  console.log('Falhas:');
  for (const f of falhas) console.log(`  #${f.id} ${f.nome}: ${f.detalhe}`);
  process.exit(1);
}
console.log('Todas as baterias adversarias passaram.');
