# Integracao do modo treinador agentico no host IAGMX

## Bootstrap obrigatorio

No boot da aplicacao (`index.ts`):

```typescript
import { inicializarChatComToolsTreinador } from './ports/chat-com-tools-host.js';

await inicializarProvedor();
inicializarChatComToolsTreinador();
```

Sem esse registro, o WhatsApp do treinador responde com fallback (sem mutar).

## Debounce

Use `tentarProcessarModoTreinador` **antes** do atendimento motorista (inalterado).
A mensagem autorizada cai em `processarMensagemTreinamentoWhatsapp` → `rodarAgenteTreinador`.

## Prompt de inferencia

Continue injetando `obterBlocoTreinamentoWhatsapp()` no prompt final (regras so apos `confirmar_aprendizado`).

## Arquivos host que o modulo espera

| Modulo host | Uso |
|-------------|-----|
| `config.ts` | DB, modelos, Qdrant |
| `util/telefone.ts` | Normalizacao |
| `servicos/chat-providers.ts` | Tipos de provedor |
| `servicos/historico.ts` | Multi-turn do agente |
| `servicos/prompt.ts` + configs | Alvos de patch |
| embeddings/Qdrant | Busca vetorial |

## Politica de confirmacao

- WhatsApp: `propor_patch` / `propor_aprendizado` gravam **pendente**; aplicar so com tool de confirmacao apos o usuario aceitar.
- Dashboard `instrucao-direta` / `patch-config` com `aplicarAgora=true` continua podendo aplicar direto (canal admin explicito).

## Testes locais do modulo

```bash
cd /root/iagmx-modo-treinador
npx tsx tests/test-agente-escopo-busca.ts
npx tsx tests/test-agente-mock-escopo.ts
```
