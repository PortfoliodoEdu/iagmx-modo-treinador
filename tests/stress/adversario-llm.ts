/**
 * Helpers do cliente oculto: LLM adversario que tenta sabotar o orquestrador.
 * Scripta tool_calls ruins, JSON invalido, loops e mutacoes impulsivas.
 * Usado pela bateria stress-orquestrador.
 */
import type { ChatMessageWithTools, ChatWithToolsFn, ToolCall } from '../../backend/src/ports/chat-com-tools.js';

export type DiarioTools = Array<{ nome: string; args: string }>;

function call(id: string, nome: string, args: unknown): ToolCall {
  return {
    id,
    type: 'function',
    function: {
      name: nome,
      arguments: typeof args === 'string' ? args : JSON.stringify(args),
    },
  };
}

/** Simula um LLM malicioso/impulsivo em roteiro por cenario. */
export function criarLlmAdversario(roteiro: string): {
  chat: ChatWithToolsFn;
  diario: DiarioTools;
} {
  const diario: DiarioTools = [];
  let passo = 0;

  const chat: ChatWithToolsFn = async (messages) => {
    passo += 1;
    const ultimaUser = [...messages].reverse().find((m) => m.role === 'user');
    const texto = String(ultimaUser?.content || '');

    if (roteiro === 'impulsivo_aplicar') {
      if (passo === 1) {
        return {
          content: null,
          tool_calls: [call('c1', 'aplicar_patch', {})],
        };
      }
      return {
        content: 'Apliquei sem perguntar (erro se o runner aplicar sem pendente).',
        tool_calls: [],
      };
    }

    if (roteiro === 'json_invalido') {
      if (passo === 1) {
        return {
          content: null,
          tool_calls: [call('c1', 'avaliar_escopo', '{pedido: sem aspas')],
        };
      }
      return { content: 'Avaliei mesmo com JSON quebrado.', tool_calls: [] };
    }

    if (roteiro === 'tool_sem_nome') {
      if (passo === 1) {
        return {
          content: null,
          tool_calls: [
            {
              id: 'x',
              type: 'function',
              function: { name: '', arguments: '{}' },
            },
            call('c2', 'avaliar_escopo', { pedido: texto }),
          ],
        };
      }
      return { content: 'Ignorei tool vazia e avaliei escopo.', tool_calls: [] };
    }

    if (roteiro === 'loop_infinito') {
      return {
        content: null,
        tool_calls: [call(`loop_${passo}`, 'avaliar_escopo', { pedido: texto })],
      };
    }

    if (roteiro === 'tool_desconhecida') {
      if (passo === 1) {
        return {
          content: null,
          tool_calls: [call('c1', 'hackear_servidor', { cmd: 'rm -rf /' })],
        };
      }
      return { content: 'A tool desconhecida foi recusada.', tool_calls: [] };
    }

    if (roteiro === 'ids_duplicados') {
      if (passo === 1) {
        return {
          content: null,
          tool_calls: [
            call('dup', 'avaliar_escopo', { pedido: 'a' }),
            call('dup', 'avaliar_escopo', { pedido: 'b' }),
          ],
        };
      }
      return { content: 'Dedupliquei tool_call_id.', tool_calls: [] };
    }

    if (roteiro === 'chat_queima') {
      throw new Error('LLM offline');
    }

    if (roteiro === 'conteudo_nulo') {
      return { content: null, tool_calls: [] };
    }

    if (roteiro === 'fora_escopo_ok') {
      if (passo === 1) {
        return {
          content: null,
          tool_calls: [call('c1', 'avaliar_escopo', { pedido: texto })],
        };
      }
      const tool = [...messages].reverse().find((m) => m.role === 'tool');
      const fora = String(tool?.content || '').includes('fora_escopo');
      return {
        content: fora
          ? 'Nao posso criar essa integracao. Posso so ajustar o prompt.'
          : 'Falhei em recusar.',
        tool_calls: [],
      };
    }

    if (roteiro === 'patch_com_confirmacao') {
      if (passo === 1) {
        return {
          content: null,
          tool_calls: [call('c1', 'propor_patch', { texto })],
        };
      }
      return {
        content: 'Segue o preview. Posso aplicar somente se voce confirmar.',
        tool_calls: [],
      };
    }

    if (roteiro === 'args_nao_string') {
      if (passo === 1) {
        return {
          content: null,
          tool_calls: [
            {
              id: 'c1',
              type: 'function',
              function: {
                name: 'avaliar_escopo',
                // @ts-expect-error adversario envia tipo errado
                arguments: { pedido: texto },
              },
            },
          ],
        };
      }
      return { content: 'Normalizei arguments nao-string.', tool_calls: [] };
    }

    return { content: `Eco: ${texto}`, tool_calls: [] };
  };

  const chatComDiario: ChatWithToolsFn = async (messages, tools, opts) => {
    const res = await chat(messages, tools, opts);
    for (const t of res.tool_calls || []) {
      diario.push({ nome: t.function.name, args: t.function.arguments });
    }
    return res;
  };

  return { chat: chatComDiario, diario };
}

export function criarExecutorEspiao(): {
  executar: (
    nome: string,
    argsJson: string,
    ctx: { telefone: string },
  ) => Promise<string>;
  chamadas: DiarioTools;
  mutacoes: string[];
} {
  const chamadas: DiarioTools = [];
  const mutacoes: string[] = [];
  const MU = new Set([
    'aplicar_patch',
    'confirmar_aprendizado',
    'propor_patch',
    'propor_aprendizado',
    'cancelar_patch',
    'cancelar_aprendizado',
    'reverter_patch',
  ]);

  return {
    chamadas,
    mutacoes,
    executar: async (nome, argsJson) => {
      chamadas.push({ nome, args: argsJson });
      if (MU.has(nome)) mutacoes.push(nome);

      if (nome === 'avaliar_escopo') {
        const { avaliarEscopoPedido } = await import('../../backend/src/agent/escopo.js');
        let pedido = '';
        try {
          pedido = String((JSON.parse(argsJson || '{}') as { pedido?: string }).pedido || '');
        } catch {
          pedido = '';
        }
        return JSON.stringify(avaliarEscopoPedido(pedido));
      }
      if (nome === 'propor_patch') {
        return JSON.stringify({
          id: 42,
          status: 'pendente',
          resumo: 'preview fake',
          instrucao: 'Nao apliquei ainda.',
        });
      }
      if (nome === 'aplicar_patch') {
        return JSON.stringify({
          erro: 'Nenhum patch pendente para este telefone',
          tool: nome,
        });
      }
      if (nome === 'hackear_servidor') {
        return JSON.stringify({ erro: 'Tool desconhecida: hackear_servidor', tool: nome });
      }
      return JSON.stringify({ ok: true, eco: nome });
    },
  };
}
