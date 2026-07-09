# Integração do modo treinador no host IAGMX

Este documento lista o que o sistema principal precisa fornecer para o módulo funcionar.

## Arquivos do host (não incluídos neste repositório)

| Módulo host | Usado por | Função |
|-------------|-----------|--------|
| `config.ts` | todos os serviços | `databaseUrl`, `promptPadrao`, Qdrant |
| `util/telefone.ts` | treinamento-whatsapp | Normalização de telefone |
| `chat-providers.ts` | whatsapp, patches, admin-direto | Chamadas LLM |
| `historico.ts` | treinamento-whatsapp | Histórico de conversa |
| `historico-configuracao.ts` | patches, aprendizados | Auditoria de mudanças |
| `prompt.ts` | alvos, busca, lote | Prompt do sistema |
| `config-mensagens-fluxo.ts` | alvos, busca, lote | Mensagens do fluxo |
| `config-orquestracao-texto.ts` | alvos, busca, lote | Tom e formatação |
| `config-ocr.ts` | alvos, busca, lote | Prompts OCR |
| `config-ocr-documentos.ts` | alvos, busca, lote | Schemas de documentos |
| `vetorizacao.ts` | treinamento-config-vetorial | Embeddings Qdrant |

## Passo a passo de integração

### 1. Copiar serviços

Copie `backend/src/servicos/treinamento-*.ts` para `iagmx-atendimento/app/src/servicos/`.

### 2. Inicializar no boot

```typescript
import { inicializarTreinamentoWhatsapp } from './servicos/treinamento-whatsapp.js';

await inicializarTreinamentoWhatsapp();
```

### 3. Gate no debounce

Substitua o bloco inline em `debounce.ts` por:

```typescript
import { tentarProcessarModoTreinador } from './integracao/debounce-treinador.js';

const tratado = await tentarProcessarModoTreinador(
  { telefone: numero, remoteJid, textoUsuario, pushName, traceId, mensagensEntrada: mensagens.length, origem },
  { adicionarEtapa, finalizarTrace, tentarEnviarResposta, adicionarAoHistorico, instance },
  t0,
);
if (tratado) return;
```

### 4. Rotas admin

```typescript
import { registrarRotasTreinamentoAdmin } from './rotas/treinamento-admin.js';

registrarRotasTreinamentoAdmin(app, exigirAdmin);
```

### 5. Prompt de inferência

Em `prompt.ts`, na função `obterPromptParaInferencia`:

```typescript
import { obterBlocoTreinamentoWhatsapp } from './treinamento-whatsapp.js';

const blocoTreino = await obterBlocoTreinamentoWhatsapp().catch(() => '');
const promptFinal = [promptCompleto, blocoTreino].filter(Boolean).join('\n\n');
```

### 6. UI ERP

- `ui/erp/TrainingPhonesPanel.tsx` → montar em gestão de usuários
- `ui/erp/iagmxTrainingService.ts` → configurar `VITE_IAGMX_URL` e `VITE_IAGMX_ADMIN_KEY`

### 7. UI /phone

- `ui/phone/phone-training.js` e `.css` → servir em `/phone` do IAGMX

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Postgres com tabelas do treinador |
| `VITE_IAGMX_URL` | UI ERP | URL da API IAGMX |
| `VITE_IAGMX_ADMIN_KEY` | UI ERP | Chave admin (`x-iagmx-key`) |
| Qdrant URL/coleção | Não | Busca vetorial de trechos (fallback lexical) |

## Autenticação admin

Todas as rotas `/api/admin/treinamento/*` exigem `exigirAdmin` do host — header `x-iagmx-key` ou sessão equivalente.

## Sincronização com o monorepo original

Este repositório é um **espelho focado**. Ao alterar o modo treinador no IAGMX em produção, sincronize os arquivos `treinamento-*` e a UI correspondente para manter paridade.
