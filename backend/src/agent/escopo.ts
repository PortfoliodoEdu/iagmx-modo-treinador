/**
 * Politica de escopo do modo treinador: decide se o pedido e viavel.
 * Evita gravar regras inuteis ou tentar patches impossiveis (ex.: integracao nova).
 * Usado pela tool avaliar_escopo do agente.
 */
import { normalizarTextoPolitica } from './texto-politica.js';

export type ResultadoEscopo = {
  dentroDoEscopo: boolean;
  categoria: 'prompt_regras' | 'patch_config' | 'pergunta' | 'fora_escopo' | 'ambiguo';
  motivo: string;
  alternativa?: string;
};

const FORA =
  /(integra(r|cao)|asana|jira|slack(\s+api)?|webhook\s+novo|criar\s+api|deploy|docker|kubernetes|conectar\s+(com|ao|a)|plugin\s+novo|codigo\s+fonte|pull\s+request|banco\s+de\s+dados\s+externo|crm\s+novo|nova\s+integracao)/i;
const PATCH =
  /(substitu|troc|corrig|reescrev|ajuste|tom|mensagem|prompt|bloco|trecho|mais\s+agressiv|mais\s+amigav|mais\s+formal|mais\s+educad)/i;
const APREND =
  /(aprenda|nova\s+regra|\bregras?\s*:|a\s+partir\s+de\s+agora|\bsempre\b|\bnunca\b|quando\s+.*\s+voce|comportamento|quero\s+que\s+(voce|a\s+ia))/i;
const PERG = /(como\s+voce|o\s+que\s+voce|quais\s+regras|explique|resuma|listar|como\s+esta\s+respondendo)/i;

export function avaliarEscopoPedido(pedido: string): ResultadoEscopo {
  const bruto = String(pedido || '').trim();
  const texto = normalizarTextoPolitica(pedido);
  if (!texto || texto.replace(/\s+/g, '').length < 3) {
    return {
      dentroDoEscopo: false,
      categoria: 'ambiguo',
      motivo: 'Pedido vazio ou muito curto.',
      alternativa: 'Descreva o que quer mudar no comportamento ou em qual mensagem/prompt.',
    };
  }

  const temFora = FORA.test(texto);
  const temPatch = PATCH.test(texto);
  const temAprend = APREND.test(texto);
  const temPerg = PERG.test(texto);

  if (temFora && !temPatch && !temAprend) {
    return {
      dentroDoEscopo: false,
      categoria: 'fora_escopo',
      motivo: 'O pedido parece exigir integracao, infraestrutura ou codigo novo — fora do treinador.',
      alternativa:
        'Posso ajustar o prompt/mensagens para a IA orientar o usuario sobre isso, sem criar a integracao.',
    };
  }

  if (temPerg && !temPatch && !temAprend) {
    return {
      dentroDoEscopo: true,
      categoria: 'pergunta',
      motivo: 'Parece pergunta sobre estado/comportamento atual.',
    };
  }

  if (temPatch) {
    return {
      dentroDoEscopo: true,
      categoria: 'patch_config',
      motivo: 'Pedido relacionado a edicao de textos/configs existentes.',
    };
  }

  if (temAprend) {
    return {
      dentroDoEscopo: true,
      categoria: 'prompt_regras',
      motivo: 'Pedido relacionado a regra comportamental global.',
    };
  }

  if (temFora) {
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
