# Backend — Modo Treinador

Núcleo do modo treinador IAGMX.

## Pastas

- `servicos/` — lógica de negócio (WhatsApp, patches, busca)
- `rotas/` — plugin Fastify `registrarRotasTreinamentoAdmin`
- `integracao/` — `tentarProcessarModoTreinador` para debounce
- `domain/` — tipos e ports de integração

## Build

```bash
npm run build
```

Compila para `backend/dist/` (requer dependências do host nos imports relativos).

## Relacionado

- [INTEGRACAO.md](../docs/INTEGRACAO.md)
- [ARQUITETURA.md](../docs/ARQUITETURA.md)
