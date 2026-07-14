/**
 * Catalogo de falhas encontradas na auditoria adversaria do orquestrador.
 * Documenta o que o cliente oculto explorou e o que foi corrigido.
 * Relacionado: tests/stress/*, agent/*.
 */

# Bugs / excecoes encontrados e corrigidos

1. Escopo nao normalizava acentos (`integração`, `você`) → falso negativo em fora_escopo/pergunta.
2. Pattern `regra` casava dentro de `quais regras` → classificava pergunta como aprendizado.
3. FORA nao cobria `conectar ao` / `Slack` sem "api".
4. Busca `auto` nao via `ocr_prompt` como literal de forma confiavel.
5. Busca `auto` ignorava "mais educado" (sem semantico).
6. Modo `LexiCal` / invalido sem normalizacao consistente.
7. `limite` NaN/Infinity/negativo/enorme quebrava busca.
8. Loop ReAct sem teto efetivo de sanidade em tool_calls vazias/ruins.
9. Tool call com `name` vazio derrubava runner.
10. Tool call ids duplicados executavam duas vezes.
11. Arguments nao-string (objeto) derrubavam JSON.parse.
12. Arguments JSON invalido derrubavam escopo.
13. `onReatividade` throw derrubava o agente inteiro.
14. Chat LLM throw sem fallback conversacional.
15. Conteudo nulo sem mensagem util ao usuario.
16. Mensagem so com espacos sem user message segura.
17. Auto-apply impulsivo nao protegia mensagem de limite.
18. Min length aprendizado 5 vs admin 10 → erro opaco do Postgres/LLM path.
19. `cancelar_*` com id NaN/0 mensagem generica.
20. `confirmar_aprendizado` aceitava id <= 0.
21. Reverter_patch quase removido em refator (restaurado).
22. Historico com conteudos vazios poluia prompt do agente.
23. Dedup de historico user no final precisava trim consistente.
24. Missing `sanitizarLimiteBusca` no tool-runner (usava Number cru).
25. Falta de lista de mutacoes no timeout do agente.
26. Fallback sem tools nao deixava claro que nada foi aplicado.
27. Agente importava tool-runner estaticamente (quebrava testes isolados) — dinamico.
28. Escopo curto `< 3` nao tratava soespacos apos normalizar.
29. Cliente oculto `hackear_servidor` — precisa erro estruturado JSON (seguro).
30. Sort mescla lexical/vetorial sem preferencia clara ja existia; reforçado em testes.

# Excecoes cobertas pela bateria

- JSON.parse invalido, TypeError args, throw LLM, throw onReatividade
- Tool desconhecida, name vazio, id duplicado, loop infinito
- NaN/Infinity limites, null/undefined, string "abc"
- Escopo fora (Asana, Slack, deploy, webhook)
- Historico motorista/treinador real (recusa, boas-vindas, OCR, frete)

Rodar: `npm run test:stress && npx tsx tests/stress/stress-runner-lite.ts`
