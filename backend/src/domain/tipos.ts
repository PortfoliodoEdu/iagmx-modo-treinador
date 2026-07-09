/**
 * Tipos públicos do domínio do modo treinador IAGMX.
 * Exportados para integração em hosts (ERP, painel /phone, testes).
 */
export type {
  TelefoneTreinador,
  AprendizadoWhatsapp,
  PropostaAprendizadoWhatsapp,
} from '../servicos/treinamento-whatsapp.js';

export type { PatchConfiguracaoPendente } from '../servicos/treinamento-config-patches.js';

export type {
  AlvoPatchTreinamento,
  OperacaoPatchTreinamento,
  PatchTreinamentoAplicavel,
} from '../servicos/treinamento-config-alvos.js';
