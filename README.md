# IAGMX — Modo Treinador

Módulo do **modo treinador agentico** (pair programming via WhatsApp): LLM com tools escolhe busca lexical/vetorial/híbrida, conversa antes de mutar e recusa o que está fora de escopo.

## O que mudou

O pipeline antigo (regex → caixinhas → auto-apply) foi substituído por um **agente ReAct** (`backend/src/agent/`).

## Estrutura

```
backend/src/
  agent/             # Orquestrador, tools, escopo, estrategia de busca
  ports/             # Contrato + host de chat com tool calling
  servicos/          # Motores de patch/aprendizado (bracos)
  rotas/             # Plugin Fastify admin
  integracao/        # Gate debounce WhatsApp

ui/                  # Painel ERP + /phone
tests/               # Escopo, busca auto, loop mock
docs/                # Arquitetura e integracao
```

## Comportamento

1. Telefone autorizado → agente (nao atendimento motorista)
2. Agente pode so conversar, avaliar escopo, buscar contexto, propor patch/regra
3. **Nunca** aplica patch/aprendizado sem confirmacao explicita
4. Pedidos tipo "crie integracao com Asana" → recusa + alternativa no prompt

## Tools

`avaliar_escopo`, `buscar_contexto`, `listar_alvos`, `listar_aprendizados`, `propor_patch`, `aplicar_patch`, `cancelar_patch`, `reverter_patch`, `propor_aprendizado`, `confirmar_aprendizado`, `cancelar_aprendizado`

## Integracao host

Veja [docs/INTEGRACAO.md](docs/INTEGRACAO.md). O IAGMX deve chamar `inicializarChatComToolsTreinador()` no boot.

## Testes

```bash
npm run test:agente
```

## Licenca

MIT — veja [LICENSE](LICENSE).
