/**
 * Define os schemas JSON das tools do agente treinador.
 * O LLM escolhe qual tool chamar; a execução fica em tool-runner.ts.
 * Relacionado: treinador-agent.ts, ports/chat-com-tools.ts.
 */
import type { ToolDefinition } from '../ports/chat-com-tools.js';

export const TOOLS_TREINADOR: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'avaliar_escopo',
      description:
        'Avalia se o pedido cabe no modo treinador (prompts/regras/mensagens/OCR) ou esta fora de escopo.',
      parameters: {
        type: 'object',
        properties: {
          pedido: { type: 'string', description: 'Pedido do usuario a avaliar' },
        },
        required: ['pedido'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_contexto',
      description:
        'Busca trechos editaveis relacionados ao pedido. Escolha o modo de busca.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          modo: {
            type: 'string',
            enum: ['lexical', 'vetorial', 'hibrida', 'auto'],
            description: 'Estrategia de recuperacao',
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
      name: 'listar_alvos',
      description: 'Lista alvos editaveis reais do treinador (prompt, mensagens, OCR).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_aprendizados',
      description: 'Lista regras aprendidas ativas via WhatsApp.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propor_patch',
      description:
        'Cria proposta de patch com preview ANTES/DEPOIS. NAO aplica. Peca confirmacao ao usuario.',
      parameters: {
        type: 'object',
        properties: {
          texto: { type: 'string', description: 'Descricao da mudanca desejada' },
        },
        required: ['texto'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'aplicar_patch',
      description: 'Aplica patch pendente apos confirmacao explicita. Informe id se conhecido.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'ID do patch; omite para o ultimo pendente do telefone' },
        },
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
      description: 'Reverte o ultimo patch aprovado deste telefone (ou um id especifico).',
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
        'Cria proposta de regra comportamental pendente. NAO ativa ate confirmar_aprendizado.',
      parameters: {
        type: 'object',
        properties: {
          texto: { type: 'string' },
        },
        required: ['texto'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirmar_aprendizado',
      description: 'Ativa aprendizado pendente apos confirmacao do usuario.',
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
      description: 'Cancela proposta de aprendizado pendente.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id'],
      },
    },
  },
];
