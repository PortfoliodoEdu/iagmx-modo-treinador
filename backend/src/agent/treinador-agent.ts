/**
 * Loop ReAct do modo treinador: LLM com tools, observar, repetir ate responder.
 * Conversa primeiro; so muta via tools de confirmacao.
 * Entrada principal usada por processarMensagemTreinamentoWhatsapp.
 */
import {
  obterChatComTools,
  type ChatMessageWithTools,
  type ChatWithToolsFn,
} from '../ports/chat-com-tools.js';
import { TOOLS_TREINADOR } from './tool-defs.js';
import {
  MAX_TURNOS_AGENTE,
  PROMPT_SISTEMA_TREINADOR_AGENTE,
} from './treinador-system-prompt.js';

export interface ContextoToolTreinadorLeve {
  telefone: string;
  nomeAutor?: string;
  canal?: 'whatsapp' | 'dashboard';
}

export type ExecutarToolFn = (
  nome: string,
  argsJson: string,
  ctx: ContextoToolTreinadorLeve,
) => Promise<string>;

export interface EntradaAgenteTreinador {
  telefone: string;
  remoteJid: string;
  textoUsuario: string;
  pushName?: string;
  historico?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  chatComTools?: ChatWithToolsFn;
  /** Injecao para testes; em producao usa tool-runner real. */
  executarTool?: ExecutarToolFn;
  onReatividade?: (mensagem: string) => Promise<void>;
}

function montarMensagens(
  historico: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  textoUsuario: string,
): ChatMessageWithTools[] {
  const msgs: ChatMessageWithTools[] = [
    { role: 'system', content: PROMPT_SISTEMA_TREINADOR_AGENTE },
  ];
  const uteis = historico
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-16);
  for (const m of uteis) {
    msgs.push({ role: m.role, content: m.content });
  }
  const ultima = uteis[uteis.length - 1];
  if (!ultima || ultima.role !== 'user' || ultima.content !== textoUsuario) {
    msgs.push({ role: 'user', content: textoUsuario });
  }
  return msgs;
}

async function fallbackSemTools(textoUsuario: string): Promise<string> {
  return (
    'Estou no modo treinador (pair programming), mas o canal de ferramentas esta indisponivel agora. ' +
    'Descreva o que quer mudar no prompt, tom ou mensagens — e eu retomo quando a conexao LLM com tools voltar. ' +
    `Seu pedido ficou registrado: "${textoUsuario.slice(0, 180)}". Nenhuma mudanca foi aplicada.`
  );
}

export async function rodarAgenteTreinador(opts: EntradaAgenteTreinador): Promise<string> {
  const chatFn: ChatWithToolsFn | null = opts.chatComTools || obterChatComTools();
  if (!chatFn) {
    return fallbackSemTools(opts.textoUsuario);
  }

  const ctx: ContextoToolTreinadorLeve = {
    telefone: opts.telefone,
    nomeAutor: opts.pushName,
    canal: 'whatsapp',
  };

  const messages = montarMensagens(opts.historico || [], opts.textoUsuario.trim());

  if (opts.onReatividade) {
    await opts.onReatividade('Analisando seu pedido e escolhendo a melhor estrategia...');
  }

  for (let turno = 0; turno < MAX_TURNOS_AGENTE; turno++) {
    let resultado;
    try {
      resultado = await chatFn(messages, TOOLS_TREINADOR, {
        temperature: 0.25,
        max_tokens: 1200,
      });
    } catch {
      return fallbackSemTools(opts.textoUsuario);
    }

    const toolCalls = resultado.tool_calls || [];
    if (!toolCalls.length) {
      const texto = (resultado.content || '').trim();
      return (
        texto ||
        'Pode me dar um pouco mais de detalhe sobre o que quer ajustar? Nenhuma mudanca foi aplicada.'
      );
    }

    messages.push({
      role: 'assistant',
      content: resultado.content,
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      if (opts.onReatividade && /propor_|buscar_|aplicar_|confirmar_/.test(call.function.name)) {
        await opts.onReatividade(`Executando: ${call.function.name.replace(/_/g, ' ')}...`);
      }
      const runTool =
        opts.executarTool ||
        (await import('./tool-runner.js')).executarToolTreinadorSeguro;
      const observacao = await runTool(call.function.name, call.function.arguments, ctx);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: observacao,
      });
    }
  }

  return (
    'Cheguei ao limite de passos desta rodada sem fechar a resposta. ' +
    'Resuma o que ainda falta ou confirme a ultima proposta. Nada extra foi aplicado alem das tools ja executadas.'
  );
}
