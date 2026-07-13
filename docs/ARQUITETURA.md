# Arquitetura do modo treinador (agentico)

## Fluxo WhatsApp (atual)

```
Mensagem → Debounce → telefone autorizado?
                              │
                    Sim ──────┴────── Não → Atendimento motorista
                     │
                     ▼
              rodarAgenteTreinador (ReAct)
                     │
         ┌───────────┼────────────────┐
         ▼           ▼                ▼
    Tools LLM   Conversar        Confirmar
    (buscar,    (esclarecer,     (aplicar_patch /
     propor,     recusar escopo)  confirmar_aprendizado)
     avaliar)
                     │
                     ▼
         Mutacao so apos confirmacao explicita
```

## Camadas

| Camada | Arquivos | Responsabilidade |
|--------|----------|------------------|
| Agente | `agent/treinador-agent.ts` | Loop ReAct + historico multi-turn |
| Prompt | `agent/treinador-system-prompt.ts` | Pair programming, escopo, estrategia |
| Tools | `agent/tool-defs.ts` + `tool-runner.ts` | Schemas + execucao nos motores |
| Escopo/busca | `escopo.ts`, `busca-estrategia.ts` | Recusa inteligente + lexical/vetorial/hibrida |
| Ports | `ports/chat-com-tools*.ts` | Tool calling multi-provedor |
| Motores | `servicos/treinamento-config-*` | Patch, preview, Qdrant, alvos |
| Entrada | `servicos/treinamento-whatsapp.ts` | Gate WhatsApp + CRUD |

## Tools disponiveis

- `avaliar_escopo`, `buscar_contexto` (lexical|vetorial|hibrida|auto)
- `listar_alvos`, `listar_aprendizados`
- `propor_patch` / `aplicar_patch` / `cancelar_patch` / `reverter_patch`
- `propor_aprendizado` / `confirmar_aprendizado` / `cancelar_aprendizado`

## Invariantes

1. Telefone autorizado nunca entra no fluxo de motorista.
2. Patch e aprendizado **nao** aplicam sozinhos — exigem confirmacao.
3. Pedidos fora de escopo (integracoes, codigo novo) sao recusados com alternativa.
4. O agente escolhe a estrategia de busca; o hibrido fixo deixa de ser o unico caminho.
