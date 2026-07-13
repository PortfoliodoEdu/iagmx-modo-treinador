/**
 * Testa o loop do agente com chat e tools mockados (sem Postgres/LLM real).
 * Garante ciclo Observe apos avaliar_escopo e resposta conversacional.
 */
import assert from 'node:assert/strict';
import { rodarAgenteTreinador } from '../backend/src/agent/treinador-agent.js';
import type { ChatWithToolsFn } from '../backend/src/ports/chat-com-tools.js';

let chamadas = 0;

const chatMock: ChatWithToolsFn = async () => {
  chamadas += 1;
  if (chamadas === 1) {
    return {
      content: null,
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'avaliar_escopo',
            arguments: JSON.stringify({ pedido: 'Integre com Asana agora' }),
          },
        },
      ],
    };
  }
  return {
    content:
      'Nao consigo criar a integracao com Asana. Posso ajustar o prompt para orientar o cliente — quer que eu proponha?',
    tool_calls: [],
  };
};

const resposta = await rodarAgenteTreinador({
  telefone: '5511999999999',
  remoteJid: '5511999999999@s.whatsapp.net',
  textoUsuario: 'Integre com Asana agora',
  chatComTools: chatMock,
  historico: [],
  executarTool: async (nome) => {
    assert.equal(nome, 'avaliar_escopo');
    return JSON.stringify({
      dentroDoEscopo: false,
      categoria: 'fora_escopo',
      motivo: 'integracao',
      alternativa: 'ajustar prompt',
    });
  },
});

assert.match(resposta, /Asana|prompt/i);
assert.equal(chamadas, 2);

const semTools = await rodarAgenteTreinador({
  telefone: '5511999999999',
  remoteJid: 'x',
  textoUsuario: 'oi',
  historico: [],
});
assert.match(semTools, /indisponivel|ferramentas/i);

console.log('ok — agente mock: fora de escopo + fallback sem tools');
