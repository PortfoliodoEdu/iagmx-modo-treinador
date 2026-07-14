/**
 * Executa as tools do agente treinador — cerebro controla busca, leitura e critica.
 * Despacha para motores de patch/aprendizado sem orquestrar sozinho.
 */
import { avaliarEscopoPedido } from './escopo.js';
import { decidirTipoEdicao } from './politica-edicao.js';
import { buscarContextoTreinador } from './buscar-contexto.js';
import { criticarOperacoesPatch } from './criticar-patch.js';
import {
  montarResumoAlvosTreinamento,
  obterAlvoTreinamentoAtual,
  type AlvoPatchTreinamento,
} from '../servicos/treinamento-config-alvos.js';
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

const ALVOS = new Set<string>([
  'prompt_sistema',
  'orquestracao_texto',
  'mensagens_fluxo',
  'ocr_prompt',
  'ocr_prompt_forcado',
  'ocr_documentos_schema',
]);

export async function executarToolTreinador(
  nome: string,
  argsJson: string,
  ctx: ContextoToolTreinador,
): Promise<unknown> {
  const args = parseArgs(argsJson);
  const telefone = normalizarTelefone(ctx.telefone) || ctx.telefone;
  const aprendizadoApi = await import('../servicos/treinamento-whatsapp.js');

  switch (nome) {
    case 'decidir_tipo_edicao':
      return decidirTipoEdicao(String(args.pedido || ''));

    case 'avaliar_escopo':
      return avaliarEscopoPedido(String(args.pedido || ''));

    case 'buscar_contexto': {
      const r = await buscarContextoTreinador({
        query: String(args.query || ''),
        modo: String(args.modo || 'auto'),
        limite: args.limite,
      });
      return {
        modoPedido: r.modoPedido,
        modoEfetivo: r.modoEfetivo,
        total: r.total,
        trechos: r.trechos.map((t) => ({
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

    case 'ler_alvo_completo': {
      const alvo = String(args.alvo || '');
      if (!ALVOS.has(alvo)) throw new Error(`Alvo invalido: ${alvo}`);
      const chave = args.chave != null ? String(args.chave) : null;
      if ((alvo === 'orquestracao_texto' || alvo === 'mensagens_fluxo') && !chave) {
        throw new Error(`chave obrigatoria para ${alvo}`);
      }
      const atual = await obterAlvoTreinamentoAtual(alvo as AlvoPatchTreinamento, chave);
      const max = Number(args.max_chars) > 0 ? Math.min(Number(args.max_chars), 20000) : 8000;
      const texto = atual.textoAtual;
      return {
        alvo: atual.alvo,
        chave: atual.chave,
        caracteres: texto.length,
        truncado: texto.length > max,
        texto: texto.length > max ? `${texto.slice(0, max)}\n...[truncado]` : texto,
      };
    }

    case 'listar_alvos':
      return { texto: await montarResumoAlvosTreinamento() };

    case 'listar_aprendizados': {
      const itens = (await aprendizadoApi.listarAprendizadosWhatsapp())
        .filter((i) => i.ativo)
        .slice(0, 20);
      return {
        total: itens.length,
        aviso: 'Overlays — nao substituem cirurgia em prompt_sistema quando houver alvo claro.',
        itens: itens.map((i) => ({ id: i.id, resumo: i.resumo || i.instrucao })),
      };
    }

    case 'propor_patch': {
      const texto = String(args.texto || '').trim();
      if (texto.length < 5) throw new Error('texto muito curto para propor patch');
      const modoBusca = args.modo_busca != null ? String(args.modo_busca) : 'auto';
      const patch = await criarPropostaPatchConfiguracao({
        texto,
        telefoneAutor: telefone,
        nomeAutor: ctx.nomeAutor,
        canal: ctx.canal || 'whatsapp',
        modoBusca,
        queryBusca: args.query_busca != null ? String(args.query_busca) : texto,
        limiteBusca: Number(args.limite_busca) > 0 ? Number(args.limite_busca) : 8,
      });
      return {
        id: patch.id,
        status: patch.status,
        resumo: patch.resumo,
        critica: patch.critica,
        respostaUsuario: patch.resposta_treinador,
        alvos: patch.operacoes_json.map((o) => `${o.alvo}${o.chave ? `.${o.chave}` : ''}`),
        instrucao: patch.critica && !patch.critica.aprovadoParaPerguntar
          ? `Proposta #${patch.id} com problemas na critica. Revise ou cancele antes de aplicar.`
          : `Nao apliquei. Confirme: "Confirmar patch #${patch.id}" ou cancele.`,
      };
    }

    case 'criticar_patch': {
      const id = Number(args.id);
      if (!Number.isFinite(id) || id <= 0) throw new Error('id de patch invalido');
      const patch = await obterPatchPendentePorId(id);
      if (!patch) throw new Error('Patch nao encontrado');
      return criticarOperacoesPatch({
        pedido: patch.origem_texto,
        operacoes: patch.operacoes_json,
        previews: patch.previews_json,
      });
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
      const critica = criticarOperacoesPatch({
        pedido: pendente.origem_texto,
        operacoes: pendente.operacoes_json,
        previews: pendente.previews_json,
      });
      await aprovarPatchConfiguracao(id, telefone);
      return {
        ok: true,
        id,
        resumo: pendente.resumo,
        critica,
        mensagem: `Patch #${id} aplicado.`,
      };
    }

    case 'cancelar_patch': {
      const id = Number(args.id);
      if (!Number.isFinite(id) || id <= 0) throw new Error('id de patch invalido');
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
      if (texto.length < 10) {
        throw new Error('texto deve ter pelo menos 10 caracteres para propor aprendizado');
      }
      const tipo = decidirTipoEdicao(texto);
      if (tipo.tipo === 'patch_config') {
        return {
          recusado: true,
          motivo: 'Este pedido parece patch (texto/alvo), nao overlay.',
          recomendacao: tipo.recomendacao,
        };
      }
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
        mensagem: `Proposta overlay #${proposta.id} (ainda nao ativa). Confirme antes de ativar.`,
      };
    }

    case 'confirmar_aprendizado': {
      const id = Number(args.id);
      if (!Number.isFinite(id) || id <= 0) throw new Error('id de aprendizado invalido');
      const item = await aprendizadoApi.aprovarPendenciaAprendizadoWhatsapp(id, telefone);
      return {
        ok: true,
        id: item.id,
        resumo: item.resumo || item.instrucao,
        mensagem: 'Aprendizado overlay ativado.',
      };
    }

    case 'cancelar_aprendizado': {
      const id = Number(args.id);
      if (!Number.isFinite(id) || id <= 0) throw new Error('id de aprendizado invalido');
      await aprendizadoApi.cancelarPendenciaAprendizadoWhatsapp(id, telefone);
      return { ok: true, id, mensagem: `Aprendizado #${id} cancelado.` };
    }

    default:
      throw new Error(`Tool desconhecida: ${nome}`);
  }
}

export async function executarToolTreinadorSeguro(
  nome: string,
  argsJson: string,
  ctx: ContextoToolTreinador,
): Promise<string> {
  try {
    return JSON.stringify(await executarToolTreinador(nome, argsJson, ctx));
  } catch (error) {
    return JSON.stringify({
      erro: error instanceof Error ? error.message : 'falha na tool',
      tool: nome,
    });
  }
}
