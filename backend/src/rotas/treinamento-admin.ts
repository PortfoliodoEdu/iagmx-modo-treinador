/**
 * Rotas admin do modo treinador, extraídas do IAGMX para uso como plugin Fastify.
 * Registra CRUD de telefones, aprendizados, pendências e patches de configuração.
 * Relacionado: servicos/treinamento-*.ts, integracao no host via exigirAdmin.
 */
import type { FastifyInstance } from 'fastify';
import {
  aprovarPendenciaAprendizadoWhatsapp,
  atualizarTelefoneTreinador,
  cancelarPendenciaAprendizadoWhatsapp,
  criarTelefoneTreinador,
  excluirAprendizadoWhatsapp,
  excluirTelefoneTreinador,
  listarAprendizadosWhatsapp,
  listarPendenciasAprendizadoWhatsapp,
  listarTelefonesTreinadores,
} from '../servicos/treinamento-whatsapp.js';
import {
  aprovarPatchConfiguracao,
  cancelarPatchConfiguracao,
  criarPropostaPatchConfiguracao,
  listarPatchesConfiguracaoPendentes,
  reverterPatchConfiguracao,
} from '../servicos/treinamento-config-patches.js';
import {
  aplicarInstrucaoTreinamentoDireto,
  criarPropostaTreinamentoDireto,
} from '../servicos/treinamento-admin-direto.js';

export type VerificarAdmin = (req: unknown, reply: unknown) => boolean;

export function registrarRotasTreinamentoAdmin(
  app: FastifyInstance,
  exigirAdmin: VerificarAdmin,
): void {
  app.get('/api/admin/treinamento/telefones', async (req, reply) => {
    if (!exigirAdmin(req, reply)) return;
    return { itens: await listarTelefonesTreinadores() };
  });

  app.post<{
    Body: { telefone?: string; nome?: string; cargo?: string; observacoes?: string; ativo?: boolean };
  }>('/api/admin/treinamento/telefones', async (req, reply) => {
    if (!exigirAdmin(req, reply)) return;
    if (!req.body?.telefone) {
      return reply.status(400).send({ erro: 'telefone é obrigatório' });
    }
    try {
      const item = await criarTelefoneTreinador({
        telefone: req.body.telefone,
        nome: req.body.nome,
        cargo: req.body.cargo,
        observacoes: req.body.observacoes,
        ativo: req.body.ativo,
      });
      return { ok: true, item };
    } catch (error) {
      return reply.status(400).send({ erro: error instanceof Error ? error.message : 'Falha ao criar telefone' });
    }
  });

  app.put<{
    Params: { id: string };
    Body: { telefone?: string; nome?: string; cargo?: string; observacoes?: string; ativo?: boolean };
  }>('/api/admin/treinamento/telefones/:id', async (req, reply) => {
    if (!exigirAdmin(req, reply)) return;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.status(400).send({ erro: 'id inválido' });
    try {
      const item = await atualizarTelefoneTreinador(id, req.body ?? {});
      return { ok: true, item };
    } catch (error) {
      return reply.status(400).send({ erro: error instanceof Error ? error.message : 'Falha ao atualizar telefone' });
    }
  });

  app.delete<{ Params: { id: string } }>('/api/admin/treinamento/telefones/:id', async (req, reply) => {
    if (!exigirAdmin(req, reply)) return;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.status(400).send({ erro: 'id inválido' });
    await excluirTelefoneTreinador(id);
    return { ok: true };
  });

  app.get('/api/admin/treinamento/aprendizados', async (req, reply) => {
    if (!exigirAdmin(req, reply)) return;
    return { itens: await listarAprendizadosWhatsapp() };
  });

  app.get('/api/admin/treinamento/pendencias', async (req, reply) => {
    if (!exigirAdmin(req, reply)) return;
    return { itens: await listarPendenciasAprendizadoWhatsapp() };
  });

  app.get('/api/admin/treinamento/patches', async (req, reply) => {
    if (!exigirAdmin(req, reply)) return;
    return { itens: await listarPatchesConfiguracaoPendentes() };
  });

  app.post<{
    Body: { telefoneAutor?: string; nomeAutor?: string; texto?: string; aplicarAgora?: boolean };
  }>('/api/admin/treinamento/instrucao-direta', async (req, reply) => {
    if (!exigirAdmin(req, reply)) return;
    const texto = String(req.body?.texto ?? '').trim();
    if (texto.length < 10) {
      return reply.status(400).send({ erro: 'texto deve ter pelo menos 10 caracteres' });
    }
    try {
      const entrada = {
        telefoneAutor: req.body?.telefoneAutor,
        nomeAutor: req.body?.nomeAutor,
        texto,
        autorAcao: 'dashboard',
      };
      const item = req.body?.aplicarAgora
        ? await aplicarInstrucaoTreinamentoDireto(entrada)
        : await criarPropostaTreinamentoDireto(entrada);
      return {
        ok: true,
        modo: req.body?.aplicarAgora ? 'aplicado' : 'proposta',
        item,
      };
    } catch (error) {
      return reply.status(400).send({
        erro: error instanceof Error ? error.message : 'Falha ao processar instrucao direta',
      });
    }
  });

  app.post<{
    Body: { telefoneAutor?: string; nomeAutor?: string; texto?: string; aplicarAgora?: boolean };
  }>('/api/admin/treinamento/patch-config', async (req, reply) => {
    if (!exigirAdmin(req, reply)) return;
    const texto = String(req.body?.texto ?? '').trim();
    if (texto.length < 10) {
      return reply.status(400).send({ erro: 'texto deve ter pelo menos 10 caracteres' });
    }
    try {
      const item = await criarPropostaPatchConfiguracao({
        texto,
        telefoneAutor: req.body?.telefoneAutor,
        nomeAutor: req.body?.nomeAutor,
        canal: 'dashboard',
      });
      if (req.body?.aplicarAgora) {
        await aprovarPatchConfiguracao(item.id, 'dashboard');
      }
      return {
        ok: true,
        modo: req.body?.aplicarAgora ? 'aplicado' : 'proposta',
        item,
      };
    } catch (error) {
      return reply.status(400).send({
        erro: error instanceof Error ? error.message : 'Falha ao processar patch de configuracao',
      });
    }
  });

  app.post<{ Params: { id: string }; Body: { autor?: string } }>(
    '/api/admin/treinamento/pendencias/:id/aprovar',
    async (req, reply) => {
      if (!exigirAdmin(req, reply)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return reply.status(400).send({ erro: 'id inválido' });
      try {
        const item = await aprovarPendenciaAprendizadoWhatsapp(id, req.body?.autor ?? 'dashboard');
        return { ok: true, item };
      } catch (error) {
        return reply.status(400).send({ erro: error instanceof Error ? error.message : 'Falha ao aprovar proposta' });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { autor?: string } }>(
    '/api/admin/treinamento/pendencias/:id/cancelar',
    async (req, reply) => {
      if (!exigirAdmin(req, reply)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return reply.status(400).send({ erro: 'id inválido' });
      try {
        await cancelarPendenciaAprendizadoWhatsapp(id, req.body?.autor ?? 'dashboard');
        return { ok: true };
      } catch (error) {
        return reply.status(400).send({ erro: error instanceof Error ? error.message : 'Falha ao cancelar proposta' });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { autor?: string } }>(
    '/api/admin/treinamento/patches/:id/aprovar',
    async (req, reply) => {
      if (!exigirAdmin(req, reply)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return reply.status(400).send({ erro: 'id inválido' });
      try {
        await aprovarPatchConfiguracao(id, req.body?.autor ?? 'dashboard');
        return { ok: true };
      } catch (error) {
        return reply.status(400).send({ erro: error instanceof Error ? error.message : 'Falha ao aprovar patch' });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { autor?: string } }>(
    '/api/admin/treinamento/patches/:id/cancelar',
    async (req, reply) => {
      if (!exigirAdmin(req, reply)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return reply.status(400).send({ erro: 'id inválido' });
      try {
        await cancelarPatchConfiguracao(id, req.body?.autor ?? 'dashboard');
        return { ok: true };
      } catch (error) {
        return reply.status(400).send({ erro: error instanceof Error ? error.message : 'Falha ao cancelar patch' });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { autor?: string } }>(
    '/api/admin/treinamento/patches/:id/reverter',
    async (req, reply) => {
      if (!exigirAdmin(req, reply)) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return reply.status(400).send({ erro: 'id inválido' });
      try {
        await reverterPatchConfiguracao(id, req.body?.autor ?? 'dashboard');
        return { ok: true };
      } catch (error) {
        return reply.status(400).send({ erro: error instanceof Error ? error.message : 'Falha ao reverter patch' });
      }
    },
  );

  app.delete<{ Params: { id: string } }>('/api/admin/treinamento/aprendizados/:id', async (req, reply) => {
    if (!exigirAdmin(req, reply)) return;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.status(400).send({ erro: 'id inválido' });
    await excluirAprendizadoWhatsapp(id);
    return { ok: true };
  });
}
