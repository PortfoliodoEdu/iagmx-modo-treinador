/**
 * Camada agentica do modo treinador: orquestracao ReAct + tools.
 * Substitui o pipeline regex/classificador por LLM com agencia.
 * Relacionado: servicos/treinamento-*.ts, ports/chat-com-tools.ts.
 */

# Conteudo

- `treinador-agent.ts` — loop ReAct
- `treinador-system-prompt.ts` — comportamento pair-programming
- `tool-defs.ts` — schemas das tools
- `tool-runner.ts` — execucao nos motores de patch/busca
- `escopo.ts` — recusa inteligente fora de escopo
- `busca-estrategia.ts` — lexical | vetorial | hibrida | auto
