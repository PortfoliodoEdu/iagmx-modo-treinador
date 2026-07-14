/**
 * Camada agentica do modo treinador: orquestracao com politica, leitura e critica.
 * Substitui pipeline cego por cerebro que controla busca e tipo de edicao.
 * Relacionado: servicos/treinamento-*.ts, ports/chat-com-tools.ts.
 */

# Conteudo

- `treinador-agent.ts` — loop ReAct
- `treinador-system-prompt.ts` — fluxo patch/overlay obrigatorio
- `tool-defs.ts` / `tool-runner.ts` — tools incluindo ler_alvo e criticar
- `politica-edicao.ts` — patch vs aprendizado
- `criticar-patch.ts` — critica automatica do diff
- `buscar-contexto.ts` — busca controlada pelo agente
- `escopo.ts` / `busca-estrategia.ts` / `mescla-trechos.ts`
