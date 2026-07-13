/**
 * Contrato de chat com tool calling para o agente treinador.
 * O host (IAGMX) implementa via OpenAI-compat ou Anthropic tool_use.
 * Se o provedor falhar, o agente cai em conversa sem mutação.
 */

export type ChatRoleComTools = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolFunctionDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolDefinition {
  type: 'function';
  function: ToolFunctionDef;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ChatMessageWithTools {
  role: ChatRoleComTools;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatWithToolsResult {
  content: string | null;
  tool_calls: ToolCall[];
  finish_reason?: string;
  provedor?: string;
  modelo?: string;
}

export type ChatWithToolsFn = (
  messages: ChatMessageWithTools[],
  tools: ToolDefinition[],
  opts?: { temperature?: number; max_tokens?: number },
) => Promise<ChatWithToolsResult>;

/** Porta injetável: host registra a implementação em runtime. */
let implementacao: ChatWithToolsFn | null = null;

export function registrarChatComTools(fn: ChatWithToolsFn): void {
  implementacao = fn;
}

export function obterChatComTools(): ChatWithToolsFn | null {
  return implementacao;
}

export async function chatCompletionWithTools(
  messages: ChatMessageWithTools[],
  tools: ToolDefinition[],
  opts?: { temperature?: number; max_tokens?: number },
): Promise<ChatWithToolsResult> {
  if (!implementacao) {
    throw new Error('chatCompletionWithTools nao registrado pelo host');
  }
  return implementacao(messages, tools, opts);
}
