/**
 * Adaptadores Claude Messages API para tool_use / tool_result.
 * Mantem chat-com-tools-host.ts curto e focado no registro multi-provedor.
 */
import { config } from '../config.js';
import type {
  ChatMessageWithTools,
  ChatWithToolsResult,
  ToolCall,
  ToolDefinition,
} from './chat-com-tools.js';

function separarSistema(messages: ChatMessageWithTools[]): {
  system: string;
  msgs: ChatMessageWithTools[];
} {
  const systemParts: string[] = [];
  const msgs: ChatMessageWithTools[] = [];
  for (const m of messages) {
    if (m.role === 'system') systemParts.push(m.content || '');
    else msgs.push(m);
  }
  return { system: systemParts.join('\n\n'), msgs };
}

function paraMensagensClaude(messages: ChatMessageWithTools[]) {
  const out: Array<{ role: 'user' | 'assistant'; content: unknown }> = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    if (m.role === 'tool') {
      const last = out[out.length - 1];
      const bloco = {
        type: 'tool_result',
        tool_use_id: m.tool_call_id || '',
        content: m.content || '',
      };
      if (last?.role === 'user' && Array.isArray(last.content)) {
        (last.content as unknown[]).push(bloco);
      } else {
        out.push({ role: 'user', content: [bloco] });
      }
      continue;
    }
    if (m.role === 'assistant' && m.tool_calls?.length) {
      const content: unknown[] = [];
      if (m.content) content.push({ type: 'text', text: m.content });
      for (const t of m.tool_calls) {
        let input: Record<string, unknown> = {};
        try {
          input = JSON.parse(t.function.arguments || '{}') as Record<string, unknown>;
        } catch {
          input = {};
        }
        content.push({
          type: 'tool_use',
          id: t.id,
          name: t.function.name,
          input,
        });
      }
      out.push({ role: 'assistant', content });
      continue;
    }
    out.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content || '',
    });
  }
  return out;
}

export async function chatClaudeComTools(
  messages: ChatMessageWithTools[],
  tools: ToolDefinition[],
  opts?: { temperature?: number; max_tokens?: number },
): Promise<ChatWithToolsResult> {
  const { system, msgs } = separarSistema(messages);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropicToken,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.modeloChatClaude,
      max_tokens: opts?.max_tokens ?? 1200,
      temperature: opts?.temperature ?? 0.25,
      system: system || undefined,
      tools: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      })),
      messages: paraMensagensClaude(msgs),
    }),
    signal: AbortSignal.timeout(120000),
  });
  const data = (await res.json()) as {
    content?: Array<{
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
    stop_reason?: string;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Claude tools HTTP ${res.status}`);
  }

  const textos = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text || '')
    .join('')
    .trim();
  const toolCalls: ToolCall[] = (data.content || [])
    .filter((b) => b.type === 'tool_use' && b.id && b.name)
    .map((b) => ({
      id: b.id as string,
      type: 'function' as const,
      function: {
        name: b.name as string,
        arguments: JSON.stringify(b.input || {}),
      },
    }));

  return {
    content: textos || null,
    tool_calls: toolCalls,
    finish_reason: data.stop_reason,
    provedor: 'claude',
    modelo: config.modeloChatClaude,
  };
}
