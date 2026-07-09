# Arquitetura do modo treinador

## Fluxo WhatsApp

```
Mensagem → Debounce → telefoneAutorizadoTreinamento?
                              │
                    Sim ──────┴────── Não → Atendimento motorista
                     │
                     ▼
         processarMensagemTreinamentoWhatsapp
                     │
         ┌───────────┼───────────┬──────────┐
         ▼           ▼           ▼          ▼
    Aprendizado    Patch     Pergunta   Desfazer
         │           │           │          │
         ▼           ▼           │          ▼
 whatsapp_      configuracao    │    reverter patch
 aprendizados   + patches       │          │
         │           │           │          │
         └───────────┴───────────┴──────────┘
                     │
                     ▼
         obterBlocoTreinamentoWhatsapp()
                     │
                     ▼
              Prompt final da IA
```

## Camadas backend

| Camada | Arquivos | Responsabilidade |
|--------|----------|------------------|
| Orquestração | `treinamento-whatsapp.ts` | Classificação, aprendizado, entrada WhatsApp |
| Patches | `treinamento-config-patches.ts` | Proposta, confirmação, reversão |
| Alvos | `treinamento-config-alvos.ts` | Mapeamento prompt/mensagens/OCR |
| Busca | `treinamento-config-busca.ts` | Recuperação lexical de trechos |
| Vetorial | `treinamento-config-vetorial.ts` | Qdrant para contexto |
| Recuperação | `treinamento-config-recuperacao.ts` | Merge vetorial + lexical |
| Lote | `treinamento-config-lote.ts` | Simulação e aplicação em lote |
| Resposta | `treinamento-config-resposta.ts` | Formatação humana WhatsApp |
| Admin direto | `treinamento-admin-direto.ts` | Atalho pelo painel sem WhatsApp |

## Classificação de intenção

1. Regex/heurísticas locais (rápido, determinístico)
2. LLM classificador (`aprendizado` | `patch` | `pergunta` | `normal`)
3. Fallback para conversa curta

## Alvos editáveis por patch

- `prompt_sistema`
- `orquestracao_texto` (chaves: `camadaHumana`, `instrucaoFormatacao`)
- `mensagens_fluxo` (chave = nome da mensagem)
- `ocr_prompt`, `ocr_prompt_forcado`
- `ocr_documentos_schema` (chave = tipo de documento)

## Invariantes

1. Telefone autorizado **nunca** entra no fluxo de motorista.
2. Erros no treinador **não desligam** o modo — resposta informa continuidade.
3. Aprendizados ativos entram no prompt na próxima inferência de qualquer usuário.
4. Patches alteram configuração persistida com histórico de auditoria.

## UI

| Interface | Stack | Consumo |
|-----------|-------|---------|
| ERP GMX | React + shadcn | `iagmxTrainingService` → API admin |
| IAGMX /phone | Vanilla JS | `phone-training.js` → mesma API |
