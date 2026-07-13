/**
 * Executa as tools do agente treinador chamando os motores existentes.
 * Nao decide estrategia — so despacha argumentos validados para os servicos.
 * Relacionado: tool-defs.ts, treinamento-config-*, treinamento-whatsapp.ts.
 */
import { avaliarEscopoPedido } from './escopo.js';
import { resolverModoBusca } from './busca-estrategia.js';
import { buscarTrechosRelacionadosTreinamento } from '../servicos/treinamento-config-busca.js';
import { buscarTrechosVetoriaisTreinamento } from '../servicos/treinamento-config-vetorial.js';
import { mesclarTrechosTreinamentoParaTeste } from '../servicos/treinamento-config-recuperacao.js';
import { montarResumoAlvosTreinamento } from '../servicos/treinamento-config-alvos.js';
import {
  aprovarPatchConfiguracao,
  cancelarPatchConfiguracao,
  criarPropostaPatchConfiguracao,
  obterPatchPendentePorId,
  obterUltimoPatchPendentePorTelefone,
  reverterPatchConfiguracao,
  reverterUltimoPatchAprovado,
} from '../servicos/treinamento-config-patches.js';
import { criarPropostaTreinamentoDireto } from '../servicos/treinamento-admin-direto.js';
import { normalizarTelefone } from '../util/telefone.js';

export interface ContextoToolTreinador {
  telefone: string;
  nomeAutor?: string;
  canal?: 'whatsapp' | 'dashboard';
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function buscarComModo(query: string, modo: string, limite = 8) {
  const { modoEfetivo, escolhido } = resolverModoBusca(modo, query);
  let trechos;
  if (modoEfetivo === 'lexical') {
    trechos = await buscarTrechosRelacionadosTreinamento(query, limite);
  } else if (modoEfetivo === 'vetorial') {
    trechos = await buscarTrechosVetoriaisTreinamento(query, limite);
  } else {
    const [vetorial, lexical] = await Promise.all([
      buscarTrechosVetoriaisTreinamento(query, limite).catch(() => []),
      buscarTrechosRelacionadosTreinamento(query, limite).catch(() => []),
    ]);
    trechos = mesclarTrechosTreinamentoParaTeste(vetorial, lexical, limite);
  }
  return {
    modoPedido: escolhido,
    modoEfetivo,
    total: trechos.length,
    trechos: trechos.map((t) => ({
      alvo: t.alvo,
      chave: t.chave,
      rotulo: t.rotulo,
      score: t.score,
      origemBusca: t.origemBusca,
      trecho: t.texto.slice(0, 500),
      motivo: t.motivo,
    })),
  };
}

export async function executarToolTreinador(
  nome: string,
  argsJson: string,
  ctx: ContextoToolTreinador,
): Promise<unknown> {
  const args = parseArgs(argsJson);
  const telefone = normalizarTelefone(ctx.telefone) || ctx.telefone;
  const aprendizadoApi = await import('../servicos/treinamento-whatsapp.js');

  switch (nome) {
    case 'avaliar_escopo':
      return avaliarEscopoPedido(String(args.pedido || ''));

    case 'buscar_contexto':
      return buscarComModo(
        String(args.query || ''),
        String(args.modo || 'auto'),
        Number(args.limite) > 0 ? Number(args.limite) : 8,
      );

    case 'listar_alvos':
      return { texto: await montarResumoAlvosTreinamento() };

    case 'listar_aprendizados': {
      const itens = (await aprendizadoApi.listarAprendizadosWhatsapp())
        .filter((i) => i.ativo)
        .slice(0, 20);
      return {
        total: itens.length,
        itens: itens.map((i) => ({ id: i.id, resumo: i.resumo || i.instrucao })),
      };
    }

    case 'propor_patch': {
      const texto = String(args.texto || '').trim();
      if (texto.length < 5) throw new Error('texto muito curto para propor patch');
      const patch = await criarPropostaPatchConfiguracao({
        texto,
        telefoneAutor: telefone,
        nomeAutor: ctx.nomeAutor,
        canal: ctx.canal || 'whatsapp',
      });
      return {
        id: patch.id,
        status: patch.status,
        resumo: patch.resumo,
        respostaUsuario: patch.resposta_treinador,
        alvos: patch.operacoes_json.map((o) => `${o.alvo}${o.chave ? `.${o.chave}` : ''}`),
        instrucao:
          `Nao apliquei ainda. Peca confirmacao: "Confirmar patch #${patch.id}" ou "Cancelar patch #${patch.id}".`,
      };
    }

    case 'aplicar_patch': {
      let id = Number(args.id);
      if (!Number.isFinite(id) || id <= 0) {
        const ultimo = await obterUltimoPatchPendentePorTelefone(telefone);
        if (!ultimo) throw new Error('Nenhum patch pendente para este telefone');
        id = ultimo.id;
      }
      const pendente = await obterPatchPendentePorId(id);
      if (!pendente || pendente.status !== 'pendente') {
        throw new Error(`Patch #${id} nao esta pendente`);
      }
      await aprovarPatchConfiguracao(id, telefone);
      return { ok: true, id, resumo: pendente.resumo, mensagem: `Patch #${id} aplicado.` };
    }

    case 'cancelar_patch': {
      const id = Number(args.id);
      if (!Number.isFinite(id)) throw new Error('id invalido');
      await cancelarPatchConfiguracao(id, telefone);
      return { ok: true, id, mensagem: `Patch #${id} cancelado.` };
    }

    case 'reverter_patch': {
      const id = Number(args.id);
      if (Number.isFinite(id) && id > 0) {
        await reverterPatchConfiguracao(id, telefone);
        return { ok: true, id, mensagem: `Patch #${id} revertido.` };
      }
      const revertido = await reverterUltimoPatchAprovado(telefone, telefone);
      if (!revertido) return { ok: false, mensagem: 'Nenhum patch aprovado para reverter.' };
      return {
        ok: true,
        id: revertido.id,
        mensagem: `Patch #${revertido.id} revertido: ${revertido.resumo}`,
      };
    }

    case 'propor_aprendizado': {
      const texto = String(args.texto || '').trim();
      if (texto.length < 5) throw new Error('texto muito curto para aprendizado');
      const proposta = await criarPropostaTreinamentoDireto({
        texto,
        telefoneAutor: telefone,
        nomeAutor: ctx.nomeAutor,
        autorAcao: telefone,
      });
      return {
        id: proposta.id,
        status: proposta.status,
        resumo: proposta.resumo_sugerido,
        instrucao: proposta.instrucao_sugerida,
        mensagem:
          `Proposta #${proposta.id} criada (ainda nao ativa). Confirme com confirmar_aprendizado ou "Confirmar aprendizado #${proposta.id}".`,
      };
    }

    case 'confirmar_aprendizado': {
      const id = Number(args.id);
      if (!Number.isFinite(id)) throw new Error('id invalido');
      const item = await aprendizadoApi.aprovarPendenciaAprendizadoWhatsapp(id, telefone);
      return {
        ok: true,
        id: item.id,
        resumo: item.resumo || item.instrucao,
        mensagem: 'Aprendizado ativado e ja entra no prompt.',
      };
    }

    case 'cancelar_aprendizado': {
      const id = Number(args.id);
      if (!Number.isFinite(id)) throw new Error('id invalido');
      await aprendizadoApi.cancelarPendenciaAprendizadoWhatsapp(id, telefone);
      return { ok: true, id, mensagem: `Aprendizado #${id} cancelado.` };
    }

    default:
      throw new Error(`Tool desconhecida: ${nome}`);
  }
}

/** Wrapper seguro para o loop do agente. */
export async function executarToolTreinadorSeguro(
  nome: string,
  argsJson: string,
  ctx: ContextoToolTreinador,
): Promise<string> {
  try {
    const resultado = await executarToolTreinador(nome, argsJson, ctx);
    return JSON.stringify(resultado);
  } catch (error) {
    return JSON.stringify({
      erro: error instanceof Error ? error.message : 'falha na tool',
      tool: nome,
    });
  }
}
