# IAGMX — Modo Treinador

Módulo extraído do ecossistema **ERP GMX + IAGMX** com tudo relacionado ao **modo treinador**: ensino da IA por WhatsApp, patches de configuração e painéis de administração.

## O que é

O modo treinador permite que **telefones autorizados** ensinem e editem a IA de atendimento sem passar pelo fluxo normal de motorista. Há dois canais:

| Canal | Descrição |
|-------|-----------|
| **WhatsApp** | Mensagens de treinadores cadastrados entram em fluxo dedicado |
| **Painel admin** | ERP GMX ou `/phone` do IAGMX gerenciam telefones, regras e patches |

## Estrutura

```
backend/src/
  servicos/          # Núcleo: treinamento-whatsapp, patches, busca, alvos
  rotas/             # Plugin Fastify com rotas /api/admin/treinamento/*
  integracao/        # Gate de debounce para WhatsApp
  domain/            # Tipos e contratos de integração (ports)

ui/
  erp/               # TrainingPhonesPanel + iagmxTrainingService (React)
  phone/             # phone-training.js/css (painel nativo IAGMX)

tests/               # Baterias de teste do classificador e fluxo natural
docs/                # Integração e arquitetura
```

## Funcionalidades

### Aprendizado (regras comportamentais)
- Treinador envia: `Aprenda: sempre agradeça após duas recusas`
- IA resume em regra operacional e grava em `whatsapp_aprendizados`
- Regras entram no prompt de **toda inferência** via `obterBlocoTreinamentoWhatsapp()`

### Patch (edição profunda)
- Edita alvos reais: `prompt_sistema`, `orquestracao_texto`, `mensagens_fluxo`, OCR
- Busca trechos relacionados (lexical + vetorial)
- Preview ANTES/DEPOIS com confirmação

### Comandos WhatsApp
- `Aprenda: ...` / `Regra: ...` — nova regra
- Descrição de alteração — patch de configuração
- `Desfazer` — reverte último patch
- `Confirmar patch #id` / `Cancelar patch #id`

## Integração rápida

### 1. Debounce WhatsApp (antes do atendimento normal)

```typescript
import { tentarProcessarModoTreinador } from './integracao/debounce-treinador.js';

const tratado = await tentarProcessarModoTreinador(
  { telefone: numero, remoteJid, textoUsuario, pushName, traceId },
  { adicionarEtapa, finalizarTrace, tentarEnviarResposta, adicionarAoHistorico, instance },
);
if (tratado) return; // não seguir para atendimento motorista
```

### 2. Rotas admin

```typescript
import { registrarRotasTreinamentoAdmin } from './rotas/treinamento-admin.js';

registrarRotasTreinamentoAdmin(app, exigirAdmin);
```

### 3. Injetar regras no prompt

```typescript
import { obterBlocoTreinamentoWhatsapp } from './servicos/treinamento-whatsapp.js';

const promptFinal = [promptBase, await obterBlocoTreinamentoWhatsapp()].filter(Boolean).join('\n\n');
```

### 4. UI no ERP

Copie `ui/erp/` para o projeto React e ajuste imports de `@/components/ui/*`.

## Dependências do host

Este módulo **não roda sozinho**. O host IAGMX deve fornecer:

- Postgres (`DATABASE_URL`)
- `chat-providers` (LLM)
- `prompt`, `config-mensagens-fluxo`, `config-orquestracao-texto`, `config-ocr*`
- `historico`, `historico-configuracao`
- `util/telefone` (normalização)
- Qdrant (opcional, para busca vetorial de trechos)

Veja [docs/INTEGRACAO.md](docs/INTEGRACAO.md) para o mapa completo.

## Tabelas Postgres

| Tabela | Função |
|--------|--------|
| `whatsapp_telefones_treinadores` | Números autorizados |
| `whatsapp_aprendizados` | Regras ativas |
| `whatsapp_aprendizados_pendentes` | Propostas de regra |
| `whatsapp_config_patches_pendentes` | Propostas de patch |

## API admin

```
GET/POST/PUT/DELETE  /api/admin/treinamento/telefones
GET                  /api/admin/treinamento/aprendizados
GET                  /api/admin/treinamento/pendencias
GET                  /api/admin/treinamento/patches
POST                 /api/admin/treinamento/instrucao-direta
POST                 /api/admin/treinamento/patch-config
POST                 /api/admin/treinamento/pendencias/:id/aprovar|cancelar
POST                 /api/admin/treinamento/patches/:id/aprovar|cancelar|reverter
```

## Origem

Extraído de `iagmx-atendimento` e `gmx` (ERP GMX). Mantido como referência e base para evolução independente do modo treinador.

## Licença

MIT — veja [LICENSE](LICENSE).
