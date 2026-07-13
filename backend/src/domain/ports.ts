/**
 * Contratos de integração do modo treinador com o host IAGMX.
 * O módulo depende destes serviços do sistema principal — não os implementa aqui.
 * Tool calling: ver ports/chat-com-tools.ts e inicializarChatComToolsTreinador().
 */

/** Chamada ao provedor de LLM (OpenAI, etc.) */
export interface PortaChatCompletion {
  chatCompletionRaw: (
    mensagens: Array<{ role: string; content: string }>,
    opts?: { temperature?: number; max_tokens?: number },
  ) => Promise<string>;
}

/** Chat com tools — preferir ports/chat-com-tools no fluxo agentico. */
export type { ChatWithToolsFn } from '../ports/chat-com-tools.js';

/** Persistência de prompt e configurações editáveis por patch */
export interface PortaConfiguracaoIa {
  obterPromptBruto: () => Promise<string>;
  salvarPrompt: (prompt: string, origem?: string) => Promise<{ qdrantOk?: boolean }>;
  obterConfigMensagensFluxo: () => Promise<Record<string, unknown>>;
  salvarConfigMensagensFluxo: (config: Record<string, unknown>, origem?: string) => Promise<void>;
  obterConfigOrquestracaoTexto: () => Promise<Record<string, unknown>>;
  salvarConfigOrquestracaoTexto: (config: Record<string, unknown>, origem?: string) => Promise<void>;
  obterPromptOcr: () => Promise<string>;
  salvarPromptOcr: (prompt: string, origem?: string) => Promise<void>;
  obterPromptOcrForcado: () => Promise<string>;
  salvarPromptOcrForcado: (prompt: string, origem?: string) => Promise<void>;
  listarOcrDocumentos: () => Promise<Array<Record<string, unknown>>>;
  salvarOcrDocumentos: (docs: Array<Record<string, unknown>>, origem?: string) => Promise<void>;
}

/** Histórico de conversa WhatsApp e auditoria de config */
export interface PortaHistorico {
  adicionarAoHistorico: (remoteJid: string, papel: 'user' | 'assistant', texto: string) => Promise<void>;
  registrarHistoricoConfiguracao: (opts: {
    chave: string;
    origem: string;
    antes: string;
    depois: string;
  }) => Promise<void>;
}

/** Configuração de ambiente (banco, Qdrant, prompts padrão) */
export interface PortaAmbiente {
  databaseUrl: string;
  promptPadrao: string;
  qdrantUrl?: string;
  qdrantColecaoTreinamento?: string;
}
