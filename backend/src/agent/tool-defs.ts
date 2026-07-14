/**
 * Schemas JSON das tools do agente treinador (cerebro com leitura, politica e critica).
 * O LLM escolhe; a execucao fica em tool-runner.ts.
 */
import type { ToolDefinition } from '../ports/chat-com-tools.js';

export const TOOLS_TREINADOR: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'decidir_tipo_edicao',
      description:
        'Decide se o pedido pede patch (cirurgia em texto), aprendizado (overlay), hibrido, pergunta ou fora de escopo. Use ANTES de mutar.',
      parameters: {
        type: 'object',
        properties: { pedido: { type: 'string' } },
        required: ['pedido'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'avaliar_escopo',
      description: 'Atalho de escopo (dentro/fora). Prefira decidir_tipo_edicao para estrategia completa.',
      parameters: {
        type: 'object',
        properties: { pedido: { type: 'string' } },
        required: ['pedido'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_contexto',
      description: 'Busca trechos editaveis. VOCE escolhe o modo — nao deixe o sistema decidir as cegas.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          modo: {
            type: 'string',
            enum: ['lexical', 'vetorial', 'hibrida', 'auto'],
          },
          limite: { type: 'number' },
        },
        required: ['query', 'modo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ler_alvo_completo',
      description:
        'Le o texto COMPLETO de um alvo editavel (prompt_sistema, orquestracao_texto+chave, mensagens_fluxo+chave, ocr_*). Use antes de patch profundo.',
      parameters: {
        type: 'object',
        properties: {
          alvo: {
            type: 'string',
            enum: [
              'prompt_sistema',
              'orquestracao_texto',
              'mensagens_fluxo',
              'ocr_prompt',
              'ocr_prompt_forcado',
              'ocr_documentos_schema',
            ],
          },
          chave: {
            type: 'string',
            description: 'Obrigatorio para orquestracao_texto e mensagens_fluxo',
          },
          max_chars: { type: 'number', description: 'Padrao 8000' },
        },
        required: ['alvo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_alvos',
      description: 'Catalogo de alvos editaveis.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_aprendizados',
      description: 'Regras overlay ativas (whatsapp_aprendizados).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propor_patch',
      description:
        'Gera patch com preview. Passe modo_busca/query_busca para controlar a recuperacao (nao rebusca hibrido cego). NAO aplica.',
      parameters: {
        type: 'object',
        properties: {
          texto: { type: 'string' },
          modo_busca: {
            type: 'string',
            enum: ['lexical', 'vetorial', 'hibrida', 'auto'],
          },
          query_busca: { type: 'string' },
          limite_busca: { type: 'number' },
        },
        required: ['texto'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'criticar_patch',
      description: 'Critica um patch pendente (id) antes de pedir confirmacao ao usuario.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'aplicar_patch',
      description: 'Aplica patch pendente SO apos confirmacao explicita do usuario.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'number' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancelar_patch',
      description: 'Cancela patch pendente.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reverter_patch',
      description: 'Reverte patch aprovado (id) ou o ultimo do telefone.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'number' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propor_aprendizado',
      description:
        'Overlay de regra comportamental (NAO edita prompt_sistema). So se decidir_tipo_edicao indicar aprendizado_overlay.',
      parameters: {
        type: 'object',
        properties: { texto: { type: 'string' } },
        required: ['texto'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirmar_aprendizado',
      description: 'Ativa aprendizado pendente apos confirmacao.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancelar_aprendizado',
      description: 'Cancela aprendizado pendente.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id'],
      },
    },
  },
];
