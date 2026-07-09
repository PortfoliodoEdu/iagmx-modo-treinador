const IAGMX_URL = (import.meta.env.VITE_IAGMX_URL || 'https://iagmx.sanjaworks.com').replace(/\/$/, '');
const IAGMX_KEY = import.meta.env.VITE_IAGMX_ADMIN_KEY || 'iagmx-pausa-2026';

function headers() {
  return {
    'Content-Type': 'application/json',
    'x-iagmx-key': IAGMX_KEY,
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { erro?: string };
  if (!res.ok) {
    throw new Error((data as { erro?: string }).erro || `Falha ${res.status} ao acessar IAGMX`);
  }
  return data;
}

export interface TelefoneTreinador {
  id: number;
  telefone: string;
  nome: string | null;
  cargo: string | null;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface AprendizadoWhatsapp {
  id: number;
  telefone_autor: string;
  nome_autor: string | null;
  instrucao: string;
  resumo: string | null;
  origem_texto: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface PropostaAprendizadoWhatsapp {
  id: number;
  telefone_autor: string;
  nome_autor: string | null;
  instrucao_sugerida: string;
  resumo_sugerido: string | null;
  origem_texto: string;
  status: 'pendente' | 'aprovado' | 'cancelado';
  confirmado_em: string | null;
  confirmado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface WhatsappIaStatus {
  titulo?: string;
  descricao?: string;
  instance: string;
  state: string;
  conectado: boolean;
  motivoDesconexao?: string;
  podeEnviar: boolean;
  alvo: 'auxiliar_teste' | 'oficial_gmx';
  origem: string;
  servidor: string;
  numeroConectado?: string | null;
  nomePerfil?: string | null;
  atualizadoEm?: string | null;
  escopo: string;
  aviso?: string;
  preparadoServidorExterno?: boolean;
  cooldownMs?: number;
  cooldownAte?: string;
  permiteReconectar?: boolean;
  permiteQr?: boolean;
}

export interface WhatsappIaQrCode {
  ok?: boolean;
  conectado?: boolean;
  base64: string | null;
  pairingCode?: string | null;
  mensagem?: string;
  instancia?: string;
  escopo?: string;
  cooldownMs?: number;
  cooldownAte?: string;
  alvo?: 'auxiliar_teste' | 'oficial_gmx';
}

export interface WhatsappIaTargetsResponse {
  itens: WhatsappIaStatus[];
  escopo: string;
  pausaGlobalInicial: boolean;
}

export async function listarTelefonesTreinadores() {
  const res = await fetch(`${IAGMX_URL}/api/admin/treinamento/telefones`, { headers: headers() });
  return parseJson<{ itens: TelefoneTreinador[] }>(res);
}

export async function criarTelefoneTreinador(body: {
  telefone: string;
  nome?: string;
  cargo?: string;
  observacoes?: string;
  ativo?: boolean;
}) {
  const res = await fetch(`${IAGMX_URL}/api/admin/treinamento/telefones`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  return parseJson<{ ok: boolean; item: TelefoneTreinador }>(res);
}

export async function atualizarTelefoneTreinador(id: number, body: {
  telefone?: string;
  nome?: string;
  cargo?: string;
  observacoes?: string;
  ativo?: boolean;
}) {
  const res = await fetch(`${IAGMX_URL}/api/admin/treinamento/telefones/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body),
  });
  return parseJson<{ ok: boolean; item: TelefoneTreinador }>(res);
}

export async function excluirTelefoneTreinador(id: number) {
  const res = await fetch(`${IAGMX_URL}/api/admin/treinamento/telefones/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return parseJson<{ ok: boolean }>(res);
}

export async function listarAprendizadosWhatsapp() {
  const res = await fetch(`${IAGMX_URL}/api/admin/treinamento/aprendizados`, { headers: headers() });
  return parseJson<{ itens: AprendizadoWhatsapp[] }>(res);
}

export async function listarPendenciasAprendizadoWhatsapp() {
  const res = await fetch(`${IAGMX_URL}/api/admin/treinamento/pendencias`, { headers: headers() });
  return parseJson<{ itens: PropostaAprendizadoWhatsapp[] }>(res);
}

export async function aprovarPendenciaAprendizadoWhatsapp(id: number, autor: string) {
  const res = await fetch(`${IAGMX_URL}/api/admin/treinamento/pendencias/${id}/aprovar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ autor }),
  });
  return parseJson<{ ok: boolean; item: AprendizadoWhatsapp }>(res);
}

export async function cancelarPendenciaAprendizadoWhatsapp(id: number, autor: string) {
  const res = await fetch(`${IAGMX_URL}/api/admin/treinamento/pendencias/${id}/cancelar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ autor }),
  });
  return parseJson<{ ok: boolean }>(res);
}

export async function excluirAprendizadoWhatsapp(id: number) {
  const res = await fetch(`${IAGMX_URL}/api/admin/treinamento/aprendizados/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return parseJson<{ ok: boolean }>(res);
}

export async function obterWhatsappIaStatus() {
  const res = await fetch(`${IAGMX_URL}/api/whatsapp/status`, { headers: headers() });
  return parseJson<WhatsappIaStatus>(res);
}

export async function obterWhatsappIaQrCode() {
  const res = await fetch(`${IAGMX_URL}/api/whatsapp/qrcode`, { headers: headers() });
  return parseJson<WhatsappIaQrCode>(res);
}

export async function reconectarWhatsappIa() {
  const res = await fetch(`${IAGMX_URL}/api/whatsapp/reconectar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({}),
  });
  return parseJson<WhatsappIaQrCode>(res);
}

export async function listarWhatsappIaAlvos() {
  const res = await fetch(`${IAGMX_URL}/api/whatsapp/alvos`, { headers: headers() });
  return parseJson<WhatsappIaTargetsResponse>(res);
}

export async function obterWhatsappAlvoStatus(alvo: 'auxiliar_teste' | 'oficial_gmx') {
  const res = await fetch(`${IAGMX_URL}/api/whatsapp/alvos/${alvo}/status`, { headers: headers() });
  return parseJson<WhatsappIaStatus>(res);
}

export async function obterWhatsappAlvoQrCode(alvo: 'auxiliar_teste' | 'oficial_gmx') {
  const res = await fetch(`${IAGMX_URL}/api/whatsapp/alvos/${alvo}/qrcode`, { headers: headers() });
  return parseJson<WhatsappIaQrCode>(res);
}

export async function reconectarWhatsappAlvo(alvo: 'auxiliar_teste' | 'oficial_gmx') {
  const res = await fetch(`${IAGMX_URL}/api/whatsapp/alvos/${alvo}/reconectar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({}),
  });
  return parseJson<WhatsappIaQrCode>(res);
}
