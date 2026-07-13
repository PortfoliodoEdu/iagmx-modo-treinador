/**
 * Política de escopo do modo treinador: decide se o pedido é viável.
 * Evita gravar regras inúteis ou tentar patches impossíveis (ex.: integração nova).
 * Usado pela tool avaliar_escopo do agente.
 */

export type ResultadoEscopo = {
  dentroDoEscopo: boolean;
  categoria: 'prompt_regras' | 'patch_config' | 'pergunta' | 'fora_escopo' | 'ambiguo';
  motivo: string;
  alternativa?: string;
};

const FORA = /(integra(r|cao)|asana|jira|slack api|webhook novo|criar api|deploy|docker|kubernetes|conectar com|plugin novo|codigo fonte|pull request|banco de dados externo|crm novo)/i;
const PATCH = /(substitu|troc|corrig|reescrev|ajuste|tom|mensagem|prompt|bloco|trecho|mais agressiv|mais amigav|mais formal)/i;
const APREND = /(aprenda|regra|a partir de agora|sempre|nunca|quando .* voce|comportamento)/i;
const PERG = /(como voce|o que voce|quais regras|explique|resumo|listar)/i;

export function avaliarEscopoPedido(pedido: string): ResultadoEscopo {
  const texto = String(pedido || '').trim();
  if (!texto || texto.length < 3) {
    return {
      dentroDoEscopo: false,
      categoria: 'ambiguo',
      motivo: 'Pedido vazio ou muito curto.',
      alternativa: 'Descreva o que quer mudar no comportamento ou em qual mensagem/prompt.',
    };
  }

  if (FORA.test(texto) && !PATCH.test(texto) && !APREND.test(texto)) {
    return {
      dentroDoEscopo: false,
      categoria: 'fora_escopo',
      motivo: 'O pedido parece exigir integracao, infraestrutura ou codigo novo — fora do treinador.',
      alternativa:
        'Posso ajustar o prompt/mensagens para a IA orientar o usuario sobre isso, sem criar a integracao.',
    };
  }

  if (PERG.test(texto) && !PATCH.test(texto) && !APREND.test(texto)) {
    return {
      dentroDoEscopo: true,
      categoria: 'pergunta',
      motivo: 'Parece pergunta sobre estado/comportamento atual.',
    };
  }

  if (PATCH.test(texto)) {
    return {
      dentroDoEscopo: true,
      categoria: 'patch_config',
      motivo: 'Pedido relacionado a edicao de textos/configs existentes.',
    };
  }

  if (APREND.test(texto)) {
    return {
      dentroDoEscopo: true,
      categoria: 'prompt_regras',
      motivo: 'Pedido relacionado a regra comportamental global.',
    };
  }

  if (FORA.test(texto)) {
    return {
      dentroDoEscopo: false,
      categoria: 'fora_escopo',
      motivo: 'Mistura sinais de fora de escopo; priorizando recusa segura.',
      alternativa: 'Reformule focando em tom, prompt ou mensagem de fluxo existente.',
    };
  }

  return {
    dentroDoEscopo: true,
    categoria: 'ambiguo',
    motivo: 'Possivel, mas ambiguo — confirme alvo e intencao com o usuario antes de mutar.',
    alternativa: 'Pergunte: quer nova regra global ou editar um texto/mensagem especifica?',
  };
}
