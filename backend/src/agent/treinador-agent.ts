/**
 * Loop ReAct do modo treinador: LLM com tools, observar, repetir ate responder.
 * Conversa primeiro; so muta via tools de confirmacao.
 * Entrada principal usada por processarMensagemTreinamentoWhatsapp.
 */
import {
  obterChatComTools,
  type ChatMessageWithTools,
  type ChatWithToolsFn,
  type ToolCall,
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
  executarTool?: ExecutarToolFn;
  onReatividade?: (mensagem: string) => Promise<void>;
}

const TOOLS_MUTACAO = new Set([
  'aplicar_patch',
  'confirmar_aprendizado',
  'propor_patch',
  'propor_aprendizado',
  'cancelar_patch',
  'cancelar_aprendizado',
  'reverter_patch',
]);

function montarMensagens(
  historico: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  textoUsuario: string,
): ChatMessageWithTools[] {
  const msgs: ChatMessageWithTools[] = [
    { role: 'system', content: PROMPT_SISTEMA_TREINADOR_AGENTE },
  ];
  const texto = String(textoUsuario || '').trim();
  const uteis = historico
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .filter((m) => String(m.content || '').trim().length > 0)
    .slice(-16);
  for (const m of uteis) {
    msgs.push({ role: m.role, content: m.content });
  }
  const ultima = uteis[uteis.length - 1];
  if (!ultima || ultima.role !== 'user' || ultima.content !== texto) {
    msgs.push({ role: 'user', content: texto || '(mensagem vazia)' });
  }
  return msgs;
}

async function avisarReatividade(
  onReatividade: EntradaAgenteTreinador['onReatividade'],
  mensagem: string,
): Promise<void> {
  if (!onReatividade) return;
  try {
    await onReatividade(mensagem);
  } catch {
    /* reatividade nao deve derrubar o agente */
  }
}

function sanitizarToolCalls(calls: ToolCall[]): ToolCall[] {
  const vistos = new Set<string>();
  const limpos: ToolCall[] = [];
  for (const call of calls) {
    const nome = String(call?.function?.name || '').trim();
    if (!nome) continue;
    const id = String(call?.id || '').trim() || `call_${limpos.length + 1}`;
    if (vistos.has(id)) continue;
    vistos.add(id);
    let args = call.function?.arguments as unknown;
    if (typeof args !== 'string') {
      try {
        args = JSON.stringify(args ?? {});
      } catch {
        args = '{}';
      }
    }
    if (!String(args).trim()) args = '{}';
    limpos.push({
      id,
      type: 'function',
      function: { name: nome, arguments: String(args) },
    });
  }
  return limpos;
}

async function fallbackSemTools(textoUsuario: string): Promise<string> {
  return (
    'Estou no modo treinador (pair programming), mas o canal de ferramentas esta indisponivel agora. ' +
    'Descreva o que quer mudar no prompt, tom ou mensagens — e eu retomo quando a conexao LLM com tools voltar. ' +
    `Seu pedido ficou registrado: "${String(textoUsuario || '').slice(0, 180)}". Nenhuma mudanca foi aplicada.`
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

  const messages = montarMensagens(opts.historico || [], opts.textoUsuario);
  const mutacoesExecutadas: string[] = [];

  await avisarReatividade(
    opts.onReatividade,
    'Analisando seu pedido e escolhendo a melhor estrategia...',
  );

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

    const toolCalls = sanitizarToolCalls(resultado.tool_calls || []);
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
      if (/propor_|buscar_|aplicar_|confirmar_|avaliar_|listar_|reverter_|cancelar_/.test(call.function.name)) {
        await avisarReatividade(
          opts.onReatividade,
          `Executando: ${call.function.name.replace(/_/g, ' ')}...`,
        );
      }
      const runTool =
        opts.executarTool ||
        (await import('./tool-runner.js')).executarToolTreinadorSeguro;
      let observacao: string;
      try {
        observacao = await runTool(call.function.name, call.function.arguments, ctx);
      } catch (error) {
        observacao = JSON.stringify({
          erro: error instanceof Error ? error.message : 'falha na tool',
          tool: call.function.name,
        });
      }
      if (TOOLS_MUTACAO.has(call.function.name)) {
        mutacoesExecutadas.push(call.function.name);
      }
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: observacao,
      });
    }
  }

  const avisoMutacao = mutacoesExecutadas.length
    ? ` Tools de alteracao ja vistas nesta rodada: ${[...new Set(mutacoesExecutadas)].join(', ')}.`
    : ' Nenhuma mudanca extra foi aplicada alem das tools ja executadas.';

  return (
    'Cheguei ao limite de passos desta rodada sem fechar a resposta. ' +
    'Resuma o que ainda falta ou confirme a ultima proposta.' +
    avisoMutacao
  );
}
