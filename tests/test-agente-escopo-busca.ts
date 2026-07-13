/**
 * Testes puros de escopo e estrategia de busca do agente treinador.
 * Sem banco e sem LLM — valida politicas deterministicas.
 */
import assert from 'node:assert/strict';
import { avaliarEscopoPedido } from '../backend/src/agent/escopo.js';
import { resolverModoBusca, resolverModoBuscaAuto } from '../backend/src/agent/busca-estrategia.js';

assert.equal(avaliarEscopoPedido('Crie uma integracao com Asana').dentroDoEscopo, false);
assert.equal(avaliarEscopoPedido('Crie uma integracao com Asana').categoria, 'fora_escopo');
assert.equal(avaliarEscopoPedido('Deixe o tom mais agressivo no fechamento').categoria, 'patch_config');
assert.equal(avaliarEscopoPedido('Aprenda: sempre agradeça').categoria, 'prompt_regras');
assert.equal(resolverModoBuscaAuto('mude mensagens_fluxo.boasVindas'), 'lexical');
assert.equal(resolverModoBuscaAuto('deixe o tom mais amigavel'), 'vetorial');
assert.equal(resolverModoBusca('auto', 'tom mais formal').modoEfetivo, 'vetorial');
assert.equal(resolverModoBusca('lexical', 'qualquer').modoEfetivo, 'lexical');
console.log('ok — todos os testes de escopo/busca passaram');
