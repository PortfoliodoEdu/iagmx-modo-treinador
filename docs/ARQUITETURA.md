# Arquitetura do modo treinador (cerebro profundo)

## Fluxo de edicao (obrigatorio)

```
Pedido
  → decidir_tipo_edicao
  → buscar_contexto(modo escolhido pelo agente)
  → ler_alvo_completo (se cirurgia estrutural)
  → propor_patch(modo_busca + query_busca)  // NAO rebusca hibrido cego
  → critica automatica + criticar_patch opcional
  → confirmacao do usuario
  → aplicar_patch | cancelar
```

## Patch vs aprendizado

| Tipo | Quando | Efeito |
|------|--------|--------|
| `patch_config` | Texto/tom/mensagem/prompt/OCR concretos | Cirurgia no alvo persistido |
| `aprendizado_overlay` | Regra transversal sem alvo claro | Bloco no fim do prompt |
| `hibrido` | Mistura | Patch primeiro |
| `fora_escopo` | Integracao/codigo/infra | Recusa + alternativa |

## Capacidade real de profundidade

- **Sim:** gravar `prompt_sistema`, orquestracao, mensagens, OCR com preview/revert.
- **Melhor agora:** agente controla busca; le alvo completo; critica replace cego; recusa overlay indevido.
- **Ainda limite:** editor interno ainda e string replace (max 6 ops). Nao e compilador de prompt.

## Relacionado

- `agent/politica-edicao.ts`, `criticar-patch.ts`, `buscar-contexto.ts`
- `docs/STRESS.md`, `docs/INTEGRACAO.md`
