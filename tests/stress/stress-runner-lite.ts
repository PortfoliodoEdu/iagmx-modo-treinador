/**
 * Tests leves de mescla e limites — sem Postgres/Qdrant/host.
 */
import assert from 'node:assert/strict';
import { sanitizarLimiteBusca } from '../../backend/src/agent/busca-estrategia.js';
import { mesclarTrechosTreinamento, type TrechoMesclavel } from '../../backend/src/agent/mescla-trechos.js';

function trecho(parcial: Partial<TrechoMesclavel>): TrechoMesclavel {
  return {
    alvo: 'prompt_sistema',
    chave: null,
    rotulo: 'x',
    texto: 'hello',
    score: 0.5,
    origemBusca: 'lexical',
    ...parcial,
  };
}

let n = 0;
const fails: string[] = [];

function t(nome: string, fn: () => void) {
  n++;
  try {
    fn();
    console.log(`PASS R#${n} ${nome}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fails.push(`#${n} ${nome}: ${msg}`);
    console.log(`FAIL R#${n} ${nome} — ${msg}`);
  }
}

t('mescla: vazios', () => {
  assert.deepEqual(mesclarTrechosTreinamento([], [], 8), []);
});

t('mescla: dedup mesma chave', () => {
  const a = trecho({ texto: 'igual', origemBusca: 'vetorial', score: 0.9 });
  const b = trecho({ texto: 'igual', origemBusca: 'lexical', score: 0.2 });
  const out = mesclarTrechosTreinamento([a], [b], 8);
  assert.equal(out.length, 1);
  assert.equal(out[0].origemBusca, 'vetorial');
});

t('mescla: prefere vetorial no sort', () => {
  const a = trecho({ texto: 'a', origemBusca: 'lexical', score: 0.99 });
  const b = trecho({ texto: 'b', origemBusca: 'vetorial', score: 0.1 });
  const out = mesclarTrechosTreinamento([b], [a], 8);
  assert.equal(out[0].origemBusca, 'vetorial');
});

t('mescla: limite 0 -> []', () => {
  const out = mesclarTrechosTreinamento([trecho({ texto: '1' })], [trecho({ texto: '2' })], 0);
  assert.equal(out.length, 0);
});

t('mescla: limite 1', () => {
  const out = mesclarTrechosTreinamento(
    [trecho({ texto: '1', score: 1, origemBusca: 'vetorial' })],
    [trecho({ texto: '2', score: 0.5, origemBusca: 'lexical' })],
    1,
  );
  assert.equal(out.length, 1);
});

t('mescla: limite NaN -> []', () => {
  assert.equal(mesclarTrechosTreinamento([trecho({ texto: '1' })], [], Number.NaN).length, 0);
});

t('limite: undefined', () => assert.equal(sanitizarLimiteBusca(undefined), 8));
t('limite: null', () => assert.equal(sanitizarLimiteBusca(null), 8));
t('limite: "abc"', () => assert.equal(sanitizarLimiteBusca('abc'), 8));
t('limite: 1.9 floor', () => assert.equal(sanitizarLimiteBusca(1.9), 1));
t('limite: 0', () => assert.equal(sanitizarLimiteBusca(0), 8));

console.log(`\nRunner-lite: ${n - fails.length}/${n} pass`);
if (fails.length) {
  console.log(fails.join('\n'));
  process.exit(1);
}
