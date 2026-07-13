/**
 * Implementacao host de chat com tool calling (OpenAI-compat + Claude).
 * Registra-se em ports/chat-com-tools para o agente treinador.
 * Relacionado: chat-providers.ts, agent/treinador-agent.ts.
 */
import OpenAI from 'openai';
import { config } from '../config.js';
import {
  registrarChatComTools,
  type ChatMessageWithTools,
  type ChatWithToolsFn,
  type ChatWithToolsResult,
  type ToolCall,
  type ToolDefinition,
} from './chat-com-tools.js';
import { chatClaudeComTools } from './chat-com-tools-claude.js';
import type { ProvedorChat } from '../servicos/chat-providers.js';

let clienteOpenAI: OpenAI | null = null;
let clienteGroq: OpenAI | null = null;
let clienteOpenRouter: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!clienteOpenAI) clienteOpenAI = new OpenAI({ apiKey: config.openaiToken });
  return clienteOpenAI;
}

function getGroq(): OpenAI {
  if (!clienteGroq) {
    clienteGroq = new OpenAI({
      apiKey: config.groqToken,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return clienteGroq;
}

function getOpenRouter(): OpenAI {
  if (!clienteOpenRouter) {
    clienteOpenRouter = new OpenAI({
      apiKey: config.openrouterToken,
      baseURL: config.openrouterBaseUrl,
      defaultHeaders: {
        'HTTP-Referer': config.openrouterReferer,
        'X-Title': config.openrouterAppName,
      },
    });
  }
  return clienteOpenRouter;
}

function paraMensagensOpenAI(messages: ChatMessageWithTools[]) {
  return messages.map((m) => {
    if (m.role === 'tool') {
      return {
        role: 'tool' as const,
        content: m.content || '',
        tool_call_id: m.tool_call_id || '',
      };
    }
    if (m.role === 'assistant' && m.tool_calls?.length) {
      return {
        role: 'assistant' as const,
        content: m.content,
        tool_calls: m.tool_calls.map((t) => ({
          id: t.id,
          type: 'function' as const,
          function: { name: t.function.name, arguments: t.function.arguments },
        })),
      };
    }
    return {
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content || '',
    };
  });
}

async function chatOpenAICompatComTools(
  cliente: OpenAI,
  modelo: string,
  nome: ProvedorChat,
  messages: ChatMessageWithTools[],
  tools: ToolDefinition[],
  opts?: { temperature?: number; max_tokens?: number },
): Promise<ChatWithToolsResult> {
  const resposta = await cliente.chat.completions.create({
    model: modelo,
    messages: paraMensagensOpenAI(messages) as OpenAI.Chat.ChatCompletionMessageParam[],
    tools: tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      },
    })),
    temperature: opts?.temperature ?? 0.25,
    max_tokens: opts?.max_tokens ?? 1200,
  });

  const msg = resposta.choices[0]?.message;
  const toolCalls: ToolCall[] = (msg?.tool_calls || [])
    .filter((t) => t.type === 'function')
    .map((t) => ({
      id: t.id,
      type: 'function' as const,
      function: {
        name: t.function.name,
        arguments: t.function.arguments || '{}',
      },
    }));

  return {
    content: msg?.content ?? null,
    tool_calls: toolCalls,
    finish_reason: resposta.choices[0]?.finish_reason || undefined,
    provedor: nome,
    modelo,
  };
}

export const chatCompletionWithToolsHost: ChatWithToolsFn = async (
  messages,
  tools,
  opts,
) => {
  const tentativas: Array<() => Promise<ChatWithToolsResult>> = [];

  if (config.openrouterHabilitado && config.openrouterToken) {
    tentativas.push(() =>
      chatOpenAICompatComTools(
        getOpenRouter(),
        config.modeloChatOpenRouter,
        'openrouter',
        messages,
        tools,
        opts,
      ),
    );
  }
  if (config.anthropicToken) {
    tentativas.push(() => chatClaudeComTools(messages, tools, opts));
  }
  if (config.openaiToken) {
    tentativas.push(() =>
      chatOpenAICompatComTools(getOpenAI(), config.modeloChat, 'openai', messages, tools, opts),
    );
  }
  if (config.groqToken) {
    tentativas.push(() =>
      chatOpenAICompatComTools(getGroq(), config.modeloChatGroq, 'groq', messages, tools, opts),
    );
  }

  let ultimoErro: unknown;
  for (const tentativa of tentativas) {
    try {
      return await tentativa();
    } catch (err) {
      ultimoErro = err;
      console.error('[llm] Falha chat+tools:', err instanceof Error ? err.message : err);
    }
  }
  throw ultimoErro ?? new Error('Nenhum provedor disponivel para chat com tools');
};

export function inicializarChatComToolsTreinador(): void {
  registrarChatComTools(chatCompletionWithToolsHost);
  console.log('[llm] Tool calling do modo treinador registrado');
}
