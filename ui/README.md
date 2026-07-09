# UI — Modo Treinador

Componentes de interface para administrar o modo treinador.

## erp/

Painel React para o ERP GMX:

- `TrainingPhonesPanel.tsx` — telefones autorizados, aprendizados, pendências
- `iagmxTrainingService.ts` — cliente HTTP da API admin

**Dependências React:** shadcn/ui (`Button`, `Card`, `Table`, etc.), `lucide-react`, hook `useToast`.

**Env:** `VITE_IAGMX_URL`, `VITE_IAGMX_ADMIN_KEY`

## phone/

Painel vanilla JS embutido no `/phone` do IAGMX:

- `phone-training.js` — CRUD telefones, instrução direta, patches
- `phone-training.css` — estilos do bloco de treinamento

Incluir no HTML:

```html
<link rel="stylesheet" href="/phone-training.css" />
<script src="/phone-training.js"></script>
```

## Relacionado

- API: rotas em `backend/src/rotas/treinamento-admin.ts`
