# Backend — Modo Treinador agentico

## Pastas

- `agent/` — ReAct, tools, escopo, estrategia de busca
- `ports/` — contrato `chatCompletionWithTools` + host OpenAI/Claude
- `servicos/` — motores de patch/aprendizado (nao orquestram sozinhos)
- `rotas/` — plugin Fastify admin
- `integracao/` — gate debounce WhatsApp

## Bootstrap no host

```typescript
inicializarChatComToolsTreinador();
```

## Relacionado

- [INTEGRACAO.md](../docs/INTEGRACAO.md)
- [ARQUITETURA.md](../docs/ARQUITETURA.md)
