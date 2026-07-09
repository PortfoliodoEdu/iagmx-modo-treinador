import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { WhatsappTargetsPanel } from './WhatsappTargetsPanel';
import {
  aprovarPendenciaAprendizadoWhatsapp,
  cancelarPendenciaAprendizadoWhatsapp,
  criarTelefoneTreinador,
  atualizarTelefoneTreinador,
  excluirAprendizadoWhatsapp,
  excluirTelefoneTreinador,
  listarAprendizadosWhatsapp,
  listarPendenciasAprendizadoWhatsapp,
  listarTelefonesTreinadores,
  type AprendizadoWhatsapp,
  type PropostaAprendizadoWhatsapp,
  type TelefoneTreinador,
} from '@/services/iagmxTrainingService';
import { ChevronDown, Loader2, Plus, Save, ShieldCheck, ShieldX, Trash2 } from 'lucide-react';

const EMPTY_FORM = {
  telefone: '',
  nome: '',
  ativo: true,
};

function normalizarTelefone(valor: string) {
  return valor.replace(/\D/g, '');
}

function formatarTelefone(valor: string) {
  const digits = normalizarTelefone(valor).slice(0, 13);
  if (!digits) return '';
  if (digits.length <= 2) return `+${digits}`;
  if (digits.length <= 4) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 9) return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
}

function telefoneValido(valor: string) {
  const digits = normalizarTelefone(valor);
  return digits.length >= 12 && digits.length <= 13;
}

export function TrainingPhonesPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [telefones, setTelefones] = useState<TelefoneTreinador[]>([]);
  const [aprendizados, setAprendizados] = useState<AprendizadoWhatsapp[]>([]);
  const [pendencias, setPendencias] = useState<PropostaAprendizadoWhatsapp[]>([]);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    setErroCarregamento(null);
    try {
      const [telefonesRes, aprendizadosRes, pendenciasRes] = await Promise.all([
        listarTelefonesTreinadores(),
        listarAprendizadosWhatsapp(),
        listarPendenciasAprendizadoWhatsapp(),
      ]);
      setTelefones(telefonesRes.itens);
      setAprendizados(aprendizadosRes.itens);
      setPendencias(pendenciasRes.itens);
    } catch (error: any) {
      setErroCarregamento(error?.message || 'Nao foi possivel consultar o IAGMX');
      toast({
        title: 'Falha ao carregar treinador via WhatsApp',
        description: error?.message || 'Nao foi possivel consultar o IAGMX',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const salvarNovo = async () => {
    if (!telefoneValido(form.telefone)) {
      toast({
        title: 'Telefone invalido',
        description: 'Use telefone com DDI, DDD e numero. Exemplo: +55 11 99999-9999',
        variant: 'destructive',
      });
      return;
    }
    setSaving('novo');
    try {
      await criarTelefoneTreinador({
        telefone: normalizarTelefone(form.telefone),
        nome: form.nome.trim() || undefined,
        ativo: form.ativo,
      });
      setForm(EMPTY_FORM);
      toast({ title: 'Telefone autorizado criado' });
      await carregar();
    } catch (error: any) {
      toast({
        title: 'Nao foi possivel criar o telefone',
        description: error?.message || 'Falha desconhecida',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const atualizarCampo = async (item: TelefoneTreinador, patch: Partial<TelefoneTreinador>) => {
    setSaving(`telefone-${item.id}`);
    try {
      await atualizarTelefoneTreinador(item.id, patch);
      await carregar();
    } catch (error: any) {
      toast({
        title: 'Nao foi possivel atualizar o telefone',
        description: error?.message || 'Falha desconhecida',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const removerTelefone = async (id: number) => {
    setSaving(`delete-${id}`);
    try {
      await excluirTelefoneTreinador(id);
      toast({ title: 'Telefone removido' });
      await carregar();
    } catch (error: any) {
      toast({ title: 'Falha ao remover telefone', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const removerAprendizado = async (id: number) => {
    setSaving(`aprendizado-${id}`);
    try {
      await excluirAprendizadoWhatsapp(id);
      toast({ title: 'Aprendizado removido' });
      await carregar();
    } catch (error: any) {
      toast({ title: 'Falha ao remover aprendizado', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const aprovarPendencia = async (id: number) => {
    setSaving(`pendencia-aprovar-${id}`);
    try {
      await aprovarPendenciaAprendizadoWhatsapp(id, 'dashboard_gmx');
      toast({ title: 'Proposta confirmada e aplicada' });
      await carregar();
    } catch (error: any) {
      toast({ title: 'Falha ao aprovar proposta', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const cancelarPendencia = async (id: number) => {
    setSaving(`pendencia-cancelar-${id}`);
    try {
      await cancelarPendenciaAprendizadoWhatsapp(id, 'dashboard_gmx');
      toast({ title: 'Proposta cancelada' });
      await carregar();
    } catch (error: any) {
      toast({ title: 'Falha ao cancelar proposta', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader className="pb-3">
        <Collapsible defaultOpen={false} className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle>Configuracoes de treinamento da i.a</CardTitle>
              <p className="text-sm text-muted-foreground">
                Telefones treinadores, aprendizados recentes e propostas de confirmacao ficam agrupados aqui.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={erroCarregamento ? 'destructive' : 'default'}>
                {erroCarregamento ? 'Falha de conexao' : 'Recurso funcional'}
              </Badge>
              <Badge variant="outline">{telefones.length} telefones</Badge>
              <Badge variant="outline">{aprendizados.length} aprendizados</Badge>
              <Badge variant="outline">{pendencias.filter((item) => item.status === 'pendente').length} pendencias</Badge>
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              Abrir configuracoes de treinamento
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6">
            <CardContent className="space-y-6 px-0 pb-0">
              <div className="rounded-lg border p-4 space-y-4">
                <WhatsappTargetsPanel />
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <div>
                  <h3 className="font-medium">Telefones autorizados a treinar a IA por WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">
                    Estes numeros entram em modo treinador quando falam com o IAGMX.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={form.telefone}
                      onChange={(e) => setForm((s) => ({ ...s, telefone: formatarTelefone(e.target.value) }))}
                      inputMode="tel"
                      aria-invalid={form.telefone.length > 0 && !telefoneValido(form.telefone)}
                    />
                    <p className={`text-xs ${form.telefone.length > 0 && !telefoneValido(form.telefone) ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {form.telefone.length === 0
                        ? 'Formato esperado: +55 11 99999-9999'
                        : telefoneValido(form.telefone)
                          ? 'Telefone valido'
                          : 'Use DDI, DDD e numero'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={form.nome}
                      onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((s) => ({ ...s, ativo: e.target.checked }))} />
                  Ativo para treinar agora
                </label>

                <Button onClick={() => void salvarNovo()} disabled={saving === 'novo'} className="gap-2">
                  {saving === 'novo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Adicionar telefone autorizado
                </Button>
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-4">
                  <h3 className="font-medium">Telefones treinadores cadastrados</h3>
                </div>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando configuracao...
                  </div>
                ) : !telefones.length ? (
                  <div className="text-sm text-muted-foreground">Nenhum telefone autorizado ainda</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {telefones.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input
                              value={formatarTelefone(item.telefone)}
                              onChange={(e) =>
                                setTelefones((prev) =>
                                  prev.map((row) =>
                                    row.id === item.id ? { ...row, telefone: normalizarTelefone(e.target.value) } : row,
                                  ),
                                )
                              }
                              onBlur={() => {
                                if (!telefoneValido(item.telefone)) return;
                                void atualizarCampo(item, { telefone: normalizarTelefone(item.telefone) });
                              }}
                              inputMode="tel"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.nome || ''}
                              onChange={(e) => setTelefones((prev) => prev.map((row) => row.id === item.id ? { ...row, nome: e.target.value } : row))}
                              onBlur={() => void atualizarCampo(item, { nome: item.nome || '' })}
                            />
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              className="text-left"
                              onClick={() => void atualizarCampo(item, { ativo: !item.ativo })}
                            >
                              <Badge variant={item.ativo ? 'default' : 'secondary'}>{item.ativo ? 'Ativo' : 'Inativo'}</Badge>
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => void atualizarCampo(item, { telefone: normalizarTelefone(item.telefone), nome: item.nome || '' })} disabled={saving === `telefone-${item.id}`}>
                                {saving === `telefone-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => void removerTelefone(item.id)} disabled={saving === `delete-${item.id}`}>
                                {saving === `delete-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-4">
                  <h3 className="font-medium">Propostas pendentes de confirmacao</h3>
                  <p className="text-sm text-muted-foreground">
                    O telefone autorizado pode propor mudancas por WhatsApp, mas a regra so entra em vigor apos confirmacao.
                  </p>
                </div>
                {loading ? null : !pendencias.filter((item) => item.status === 'pendente').length ? (
                  <div className="text-sm text-muted-foreground">Nenhuma proposta pendente agora</div>
                ) : (
                  <div className="space-y-3">
                    {pendencias.filter((item) => item.status === 'pendente').map((item) => (
                      <div key={item.id} className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">#{item.id} · {item.resumo_sugerido || item.instrucao_sugerida}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.nome_autor || item.telefone_autor} · {new Date(item.criado_em).toLocaleString('pt-BR')}
                            </div>
                          </div>
                          <Badge variant="outline">pendente</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">{item.instrucao_sugerida}</div>
                        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                          Origem: {item.origem_texto}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => void aprovarPendencia(item.id)} disabled={saving === `pendencia-aprovar-${item.id}`} className="gap-1">
                            {saving === `pendencia-aprovar-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            Aprovar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => void cancelarPendencia(item.id)} disabled={saving === `pendencia-cancelar-${item.id}`} className="gap-1">
                            {saving === `pendencia-cancelar-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-4">
                  <h3 className="font-medium">Aprendizados recentes vindos do WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">
                    Tudo que entra aqui passa a compor o bloco adicional do prompt real da inferencia.
                  </p>
                </div>
                {loading ? null : !aprendizados.length ? (
                  <div className="text-sm text-muted-foreground">Nenhum aprendizado recebido ainda</div>
                ) : (
                  <div className="space-y-3">
                    {aprendizados.map((item) => (
                      <div key={item.id} className="rounded-lg border p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{item.resumo || item.instrucao}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.nome_autor || item.telefone_autor} · {new Date(item.criado_em).toLocaleString('pt-BR')}
                            </div>
                          </div>
                          <Button size="sm" variant="destructive" onClick={() => void removerAprendizado(item.id)} disabled={saving === `aprendizado-${item.id}`}>
                            {saving === `aprendizado-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">{item.instrucao}</div>
                        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">Origem: {item.origem_texto}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>

    </Card>
  );
}
