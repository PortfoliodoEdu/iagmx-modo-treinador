/**
 * Ponto de integração do modo treinador no fluxo de mensagens WhatsApp.
 * Deve ser chamado no debounce ANTES do atendimento normal ao motorista.
 * Relacionado: treinamento-whatsapp.ts, debounce do host IAGMX.
 */
import {
  processarMensagemTreinamentoWhatsapp,
  telefoneAutorizadoTreinamento,
} from '../servicos/treinamento-whatsapp.js';

export interface ContextoDebounceTreinador {
  telefone: string;
  remoteJid: string;
  textoUsuario: string;
  pushName?: string;
  traceId?: string;
  mensagensEntrada?: number;
  origem?: string;
}

export interface DependenciasDebounceTreinador {
  adicionarEtapa: (
    traceId: string,
    etapa: string,
    mensagem: string,
    dados?: Record<string, unknown>,
    duracaoMs?: number,
  ) => Promise<void>;
  finalizarTrace: (
    traceId: string,
    resultado: { status: 'ok' | 'erro'; resposta?: string; erro?: string },
  ) => Promise<void>;
  tentarEnviarResposta: (
    telefone: string,
    texto: string,
    instance: string,
    opts: {
      remoteJid: string;
      mensagensEntrada?: number;
      origem?: string;
      fragmentar?: boolean;
      agendarAtrasoInicial?: boolean;
    },
  ) => Promise<{ enviado: boolean; fragmentos?: number; motivo?: string; pendente?: boolean }>;
  adicionarAoHistorico: (remoteJid: string, papel: 'user' | 'assistant', texto: string) => Promise<void>;
  instance: string;
}

/**
 * Verifica se o telefone está autorizado e, se sim, processa em modo treinador.
 * Retorna true quando o fluxo foi tratado (host deve dar return e não seguir para atendimento).
 */
export async function tentarProcessarModoTreinador(
  ctx: ContextoDebounceTreinador,
  deps: DependenciasDebounceTreinador,
  t0 = Date.now(),
): Promise<boolean> {
  if (!(await telefoneAutorizadoTreinamento(ctx.telefone))) {
    return false;
  }

  const traceId = ctx.traceId ?? '';

  try {
    if (traceId) {
      await deps.adicionarEtapa(
        traceId,
        'treinamento_whatsapp',
        'Telefone autorizado entrou em modo de treino/admin',
        { telefone: ctx.telefone },
        Date.now() - t0,
      );
    }

    const respostaTreino = await processarMensagemTreinamentoWhatsapp({
      telefone: ctx.telefone,
      remoteJid: ctx.remoteJid,
      textoUsuario: ctx.textoUsuario,
      pushName: ctx.pushName,
      onReatividade: async (mensagem) => {
        await deps.tentarEnviarResposta(ctx.telefone, mensagem, deps.instance, {
          remoteJid: ctx.remoteJid,
          mensagensEntrada: ctx.mensagensEntrada,
          origem: ctx.origem,
          fragmentar: false,
          agendarAtrasoInicial: false,
        });
      },
    });

    const envioTreino = await deps.tentarEnviarResposta(
      ctx.telefone,
      respostaTreino,
      deps.instance,
      {
        remoteJid: ctx.remoteJid,
        mensagensEntrada: ctx.mensagensEntrada,
        origem: ctx.origem,
        fragmentar: false,
        agendarAtrasoInicial: false,
      },
    );

    if (traceId) {
      await deps.adicionarEtapa(
        traceId,
        'envio',
        envioTreino.enviado ? 'Resposta de treino enviada' : 'Resposta de treino enfileirada',
        {
          fragmentos: envioTreino.fragmentos,
          motivo: envioTreino.motivo,
          pendente: envioTreino.pendente,
        },
        0,
      );
      await deps.finalizarTrace(traceId, { status: 'ok', resposta: respostaTreino });
    }

    if (envioTreino.enviado) {
      await deps.adicionarAoHistorico(ctx.remoteJid, 'assistant', respostaTreino);
    }

    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (traceId) {
      await deps.finalizarTrace(traceId, { status: 'erro', erro: msg });
    }
    const respostaErroTreino =
      `Modo treinador ativo sem pausa: houve um erro interno ao processar seu comando, mas eu continuo no modo de edicao. Detalhe: ${msg}`;
    await deps.tentarEnviarResposta(ctx.telefone, respostaErroTreino, deps.instance, {
      remoteJid: ctx.remoteJid,
      mensagensEntrada: ctx.mensagensEntrada,
      origem: ctx.origem,
      fragmentar: false,
      agendarAtrasoInicial: false,
    });
    return true;
  }
}
