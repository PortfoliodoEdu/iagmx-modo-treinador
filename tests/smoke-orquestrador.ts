/**
 * Smoke do caminho feliz do orquestrador (sem WhatsApp/DB).
 * Valida ordem: decidir → buscar → propor(com modo) → so aplicar apos "confirma".
 */
import assert from 'node:assert/strict';
import { decidirTipoEdicao } from '../backend/src/agent/politica-edicao.js';
import { rodarAgenteTreinador } from '../backend/src/agent/treinador-agent.js';
import type { ChatWithToolsFn } from '../backend/src/ports/chat-com-tools.js';

const pedido = 'Muda a mensagem de boas vindas para algo mais informal';

// 1) politica: tem que ser patch, nao overlay
const dec = decidirTipoEdicao(pedido);
assert.equal(dec.tipo, 'patch_config', 'pedido de mensagem deve ser patch');
console.log('ok — politica patch');

// 2) fluxo ReAct scriptado: tools na ordem certa, aplicar so depois de confirmar
const chamadas: string[] = [];
let passo = 0;

const chat: ChatWithToolsFn = async (messages) => {
  passo += 1;
  const ultimoUser = [...messages].reverse().find((m) => m.role === 'user');
  const texto = String(ultimoUser?.content || '');

  if (passo === 1) {
    return {
      content: null,
      tool_calls: [
        {
          id: '1',
          type: 'function',
          function: {
            name: 'decidir_tipo_edicao',
            arguments: JSON.stringify({ pedido: texto }),
          },
        },
      ],
    };
  }
  if (passo === 2) {
    return {
      content: null,
      tool_calls: [
        {
          id: '2',
          type: 'function',
          function: {
            name: 'buscar_contexto',
            arguments: JSON.stringify({
              query: 'boas vindas informal',
              modo: 'hibrida',
            }),
          },
        },
      ],
    };
  }
  if (passo === 3) {
    return {
      content: null,
      tool_calls: [
        {
          id: '3',
          type: 'function',
          function: {
            name: 'propor_patch',
            arguments: JSON.stringify({
              texto: pedido,
              modo_busca: 'hibrida',
              query_busca: 'boas vindas informal',
            }),
          },
        },
      ],
    };
  }
  return {
    content:
      'Sugeri o patch #42 com preview. Posso aplicar so se voce confirmar.',
    tool_calls: [],
  };
};

const r1 = await rodarAgenteTreinador({
  telefone: '5511999999999',
  remoteJid: 'x',
  textoUsuario: pedido,
  historico: [],
  chatComTools: chat,
  executarTool: async (nome, args) => {
    chamadas.push(nome);
    if (nome === 'decidir_tipo_edicao') {
      return JSON.stringify(decidirTipoEdicao(JSON.parse(args).pedido));
    }
    if (nome === 'buscar_contexto') {
      const a = JSON.parse(args);
      assert.equal(a.modo, 'hibrida');
      return JSON.stringify({
        modoPedido: 'hibrida',
        modoEfetivo: 'hibrida',
        total: 1,
        trechos: [{ alvo: 'mensagens_fluxo', chave: 'boasVindas', trecho: 'Ola' }],
      });
    }
    if (nome === 'propor_patch') {
      const a = JSON.parse(args);
      assert.equal(a.modo_busca, 'hibrida');
      assert.ok(a.query_busca);
      return JSON.stringify({
        id: 42,
        status: 'pendente',
        resumo: 'boas vindas mais informal',
        critica: { aprovadoParaPerguntar: true, nota: 8, problemas: [], sugestoes: [] },
        instrucao: 'Nao apliquei. Confirme patch #42',
      });
    }
    if (nome === 'aplicar_patch') {
      throw new Error('nao deveria aplicar no primeiro turno');
    }
    return JSON.stringify({ ok: true });
  },
});

assert.deepEqual(chamadas, [
  'decidir_tipo_edicao',
  'buscar_contexto',
  'propor_patch',
]);
assert.match(r1, /confirm/i);
assert.doesNotMatch(r1, /aplicado/i);
console.log('ok — ordem feliz sem apply precoce');

// 3) segundo turno: usuario confirma → so agora aplicar_patch
passo = 0;
const chamadas2: string[] = [];
const chat2: ChatWithToolsFn = async () => {
  passo += 1;
  if (passo === 1) {
    return {
      content: null,
      tool_calls: [
        {
          id: 'a',
          type: 'function',
          function: { name: 'aplicar_patch', arguments: JSON.stringify({ id: 42 }) },
        },
      ],
    };
  }
  return { content: 'Patch #42 aplicado.', tool_calls: [] };
};

const r2 = await rodarAgenteTreinador({
  telefone: '5511999999999',
  remoteJid: 'x',
  textoUsuario: 'Confirmar patch #42',
  historico: [
    { role: 'user', content: pedido },
    { role: 'assistant', content: r1 },
  ],
  chatComTools: chat2,
  executarTool: async (nome) => {
    chamadas2.push(nome);
    return JSON.stringify({ ok: true, id: 42, mensagem: 'Patch #42 aplicado.' });
  },
});

assert.deepEqual(chamadas2, ['aplicar_patch']);
assert.match(r2, /aplicado/i);
console.log('ok — confirmacao aplica');

// 4) boot: registro de tools existe no host (arquivo)
import { readFileSync } from 'node:fs';
const indexHost = readFileSync(
  '/root/erp e ia gmx/iagmx-atendimento/app/src/index.ts',
  'utf8',
);
assert.match(indexHost, /inicializarChatComToolsTreinador/);
console.log('ok — boot registra tool calling');

console.log('SMOKE ORQUESTRADOR OK');
