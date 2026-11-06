// Pruebas del motor de reglas de Invasores espaciales (www/invasores.js). Se ejecutan con: node tests/motor.test.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const I = require(fileURLToPath(new URL('../www/invasores.js', import.meta.url)));

let ok = 0, ko = 0;
const check = (name, cond, extra = '') => { if (cond) ok++; else { ko++; console.log('  ✗ ' + name + (extra ? ' → ' + extra : '')); } };
const eq = (name, a, b) => check(name, JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));

const sinPausa = g => { g.pausa = 0; return g; };
const correr = (g, n, inp) => { for (let i = 0; i < n && !g.fin; i++) I.paso(g, typeof inp === 'function' ? inp(g) : inp); return g; };
/* Escenario: un solo invasor vivo (fila r, columna c) y una bala colocada justo debajo */
function unSolo(r, c) {
  const g = sinPausa(I.nueva({ seed: 3, auto: false }));
  g.inv.fill(0); g.inv[r * I.COLS + c] = 1; g.alive = 1; g.ut = 99999; g.bt = 99999;
  const t = I.TIPOS[[0, 1, 1, 2, 2][r]];
  g.bala = { x: I.invX(g, c, r) + t.w / 2, y: I.invY(g, r) + 20 };
  return g;
}

/* ---------- Estado inicial ---------- */
{
  const g = I.nueva({ seed: 7 });
  eq('55 invasores (5×11)', [g.alive, g.inv.length], [55, 55]);
  eq('3 vidas, 0 puntos, oleada 1', [g.vidas, g.puntos, g.oleada], [3, 0, 1]);
  eq('4 escudos', g.esc.length, 4);
  check('nivel normal por defecto', g.nivel === 2);
  eq('niveles 1, 2 y 3', Object.keys(I.NIVELES), ['1', '2', '3']);
  eq('nivel pedido', I.nueva({ nivel: 3 }).nivel, 3);
  eq('nivel inválido → normal', I.nueva({ nivel: 9 }).nivel, 2);
}

/* ---------- Puntos por fila ---------- */
for (const [r, pts] of [[0, 30], [1, 20], [2, 20], [3, 10], [4, 10]]) {
  const g = unSolo(r, 5); correr(g, 12);
  eq(`fila ${r + 1} vale ${pts}`, g.puntos, pts);
}

/* ---------- Platillo: puntos de la tabla, no al azar ---------- */
{
  const T = I.UFO_PUNTOS;
  eq('tabla del platillo: 15 valores', T.length, 15);
  check('valores posibles 50/100/150/300', T.every(v => [50, 100, 150, 300].includes(v)));
  check('el 300 sale una vez en la tabla', T.filter(v => v === 300).length === 1);
  for (const d of [1, 8, 15, 22]) {
    const g = sinPausa(I.nueva({ seed: 2, auto: false }));
    g.ut = 99999; g.bt = 99999; g.disparos = d;
    g.ufo = { x: 100 }; g.ufoDir = 1; g.inv.fill(0); g.inv[0] = 1; g.alive = 1;
    g.bala = { x: 108, y: I.W / 2 };
    g.bala.y = 32 + 7 + 4;
    correr(g, 3);
    eq(`platillo tras ${d} disparos`, g.puntos, T[d % T.length]);
  }
}

/* ---------- Vida extra a los 1500 ---------- */
{
  const g = unSolo(0, 3); g.puntos = 1480; correr(g, 12);
  eq('1510 puntos y una vida más', [g.puntos, g.vidas, g.extra], [1510, 4, true]);
  const h = unSolo(0, 3); h.puntos = 1480; h.extra = true; correr(h, 12);
  eq('la vida extra solo se da una vez', h.vidas, 3);
  const k = unSolo(0, 3); k.puntos = 1000; correr(k, 12);
  eq('por debajo de 1500 no hay vida extra', k.vidas, 3);
}

/* ---------- Disparo: solo uno en el aire ---------- */
{
  const g = sinPausa(I.nueva({ seed: 1, auto: true })); g.bt = 99999;
  I.paso(g, {});
  eq('el disparo automático saca una bala', g.disparos, 1);
  for (let i = 0; i < 5; i++) I.paso(g, {});
  eq('mientras vuela no sale otra', g.disparos, 1);
  const h = sinPausa(I.nueva({ seed: 1, auto: false })); h.bt = 99999;
  I.paso(h, {}); eq('sin disparo automático no dispara solo', h.disparos, 0);
  I.paso(h, { fire: true }); eq('con fire dispara', h.disparos, 1);
  I.paso(h, { fire: true }); eq('con fire y una bala en el aire, no repite', h.disparos, 1);
}

/* ---------- Cañón ---------- */
{
  const g = sinPausa(I.nueva({ auto: false })); g.bt = 99999; g.ut = 99999;
  const x0 = g.cx;
  correr(g, 10, { dir: 1 }); check('el cañón se mueve a la derecha', g.cx > x0);
  correr(g, 600, { dir: 1 }); check('no sale por la derecha', g.cx + I.CANON_W <= I.W);
  correr(g, 1200, { dir: -1 }); check('no sale por la izquierda', g.cx >= 0);
  correr(g, 600, { x: 100 }); check('con x objetivo llega a la posición', Math.abs(g.cx + I.CANON_W / 2 - 100) < 2);
  const a = g.cx; I.paso(g, { x: 220 }); check('la velocidad del cañón está limitada', Math.abs(g.cx - a) <= 1.7);
}

/* ---------- Formación: baja y acelera ---------- */
{
  const g = sinPausa(I.nueva({ seed: 5, auto: false })); g.bt = 99999; g.ut = 99999;
  const iy0 = g.iy; let bajo = false;
  for (let i = 0; i < 3000 && !g.fin; i++) { I.paso(g, {}); if (g.iy > iy0) { bajo = true; break; } }
  check('al tocar el borde los invasores bajan', bajo);
  const lenta = sinPausa(I.nueva({ seed: 5, auto: false })); lenta.bt = 99999; lenta.ut = 99999;
  const pocos = sinPausa(I.nueva({ seed: 5, auto: false })); pocos.bt = 99999; pocos.ut = 99999;
  pocos.inv.fill(0); pocos.inv[0] = 1; pocos.alive = 1;
  let pl = 0, pp = 0;
  for (let i = 0; i < 300; i++) { if (I.paso(lenta, {}).includes('paso')) pl++; if (I.paso(pocos, {}).includes('paso')) pp++; }
  check('con menos invasores avanzan más rápido', pp > pl, pp + ' vs ' + pl);
}

/* ---------- Invasión: fin de partida aunque queden vidas ---------- */
{
  const g = sinPausa(I.nueva({ seed: 5, auto: false })); g.bt = 99999; g.ut = 99999;
  g.iy = 180; correr(g, 400);
  eq('llegan abajo: fin por invasión', [g.fin, g.motivo], [true, 'invadida']);
  eq('la invasión deja 0 vidas', g.vidas, 0);
}

/* ---------- Bombas, vidas y fin por vidas ---------- */
{
  const g = sinPausa(I.nueva({ seed: 9, auto: false })); g.ut = 99999;
  g.bombas = [{ x: g.cx + 6, y: I.CANON_Y - 2 }]; g.bt = 99999;
  const ev = I.paso(g, {});
  eq('una bomba en el cañón quita una vida', [g.vidas, ev.includes('muerte')], [2, true]);
  const antes = g.cx; correr(g, 30, { dir: 1 }); check('destruido, no se mueve', g.cx === antes);
  correr(g, 80);
  check('tras explotar sigue la partida', !g.fin && g.muerto === 0);
  const h = sinPausa(I.nueva({ seed: 9, auto: false })); h.vidas = 1; h.ut = 99999; h.bt = 99999;
  h.bombas = [{ x: h.cx + 6, y: I.CANON_Y - 2 }]; I.paso(h, {}); correr(h, 120);
  eq('sin vidas termina', [h.fin, h.motivo], [true, 'vidas']);
}

/* ---------- Escudos ---------- */
{
  const g = sinPausa(I.nueva({ seed: 4, auto: false })); g.bt = 99999; g.ut = 99999;
  const antes = g.esc[0].reduce((a, b) => a + b, 0);
  g.bala = { x: I.ESC_X0 + 11, y: I.ESC_Y + 40 };       // dispara contra el escudo desde abajo
  correr(g, 10);
  const despues = g.esc[0].reduce((a, b) => a + b, 0);
  check('un disparo desgasta el escudo', despues < antes, antes + ' → ' + despues);
  const h = sinPausa(I.nueva({ seed: 4, auto: false })); h.bt = 99999; h.ut = 99999;
  h.bombas = [{ x: I.ESC_X0 + 11, y: I.ESC_Y - 6 }];
  const a2 = h.esc[0].reduce((a, b) => a + b, 0); correr(h, 12);
  check('una bomba desgasta el escudo', h.esc[0].reduce((a, b) => a + b, 0) < a2);
  eq('el disparo choca con una bomba', (() => { const k = sinPausa(I.nueva({ auto: false })); k.bt = 99999; k.ut = 99999; k.bala = { x: 50, y: 150 }; k.bombas = [{ x: 50, y: 140 }]; I.paso(k, {}); I.paso(k, {}); return [k.bombas.length, k.bala]; })(), [0, null]);
}

/* ---------- Oleadas ---------- */
{
  const g = sinPausa(I.nueva({ seed: 6, auto: false })); g.bt = 99999; g.ut = 99999;
  g.inv.fill(0); g.inv[0] = 1; g.alive = 1;
  g.bala = { x: I.invX(g, 0, 0) + 4, y: I.invY(g, 0) + 12 };
  const ev = I.paso(g, {});
  const ev2 = correr(g, 3) && g.ev;
  eq('limpiar la pantalla → oleada 2', g.oleada, 2);
  eq('la nueva oleada vuelve a tener 55', g.alive, 55);
  check('la nueva oleada empieza más baja', g.iy > 56);
  check('los escudos se reponen', g.esc.every(e => e.reduce((a, b) => a + b, 0) === 70));
  check('los puntos se conservan', g.puntos === 30);
}

/* ---------- Determinismo: misma semilla y mismas entradas = misma partida ---------- */
{
  const corre = seed => { const g = I.nueva({ seed, nivel: 2 }); for (let i = 0; i < 6000 && !g.fin; i++) I.paso(g, I.bot(g)); return JSON.stringify([g.puntos, g.oleada, g.tick, g.disparos, g.kills, g.vidas, g.fin]); };
  eq('misma semilla → mismo resultado', corre(42), corre(42));
  check('otra semilla → partida distinta', corre(42) !== corre(43));
  const a = I.nueva({ seed: 1 }), b = I.nueva({ seed: 1 });
  for (let i = 0; i < 2000 && !a.fin; i++) { const inp = { x: 20 + (i * 7) % 180, fire: i % 5 === 0 }; I.paso(a, inp); I.paso(b, inp); }
  eq('mismas entradas → mismo estado', JSON.stringify(a), JSON.stringify(b));
}

/* ---------- La máquina juega partidas completas ---------- */
{
  const res = {};
  for (const nivel of [1, 2, 3]) {
    let tot = 0, fin = 0, may = 0, max = 0;
    for (let s = 1; s <= 12; s++) {
      const g = I.nueva({ seed: s * 101, nivel });
      for (let i = 0; i < 60 * 60 * 12 && !g.fin; i++) I.paso(g, I.bot(g));
      tot += g.puntos; max = Math.max(max, g.puntos); may = Math.max(may, g.oleada);
      check(`bot nivel ${nivel} semilla ${s}: puntos coherentes`, g.puntos >= 0 && g.puntos % 10 === 0);
      check(`bot nivel ${nivel} semilla ${s}: vidas en rango`, g.vidas >= 0 && g.vidas <= 9);
      check(`bot nivel ${nivel} semilla ${s}: sin NaN`, [g.cx, g.ix, g.iy, g.puntos].every(Number.isFinite));
      check(`bot nivel ${nivel} semilla ${s}: kills ≤ 55·oleada`, g.kills <= 55 * g.oleada);
      if (g.fin) fin++;
    }
    res[nivel] = { media: Math.round(tot / 12), max, oleadaMax: may, terminadas: fin };
    check(`el bot puntúa en el nivel ${nivel}`, tot / 12 > 150, JSON.stringify(res[nivel]));
  }
  console.log('  bots:', JSON.stringify(res));
  check('el nivel difícil no da más puntos que el fácil de media', res[3].media <= res[1].media * 1.5);
}

/* ---------- Resultado para el servidor ---------- */
{
  const g = I.nueva({ seed: 8 }); for (let i = 0; i < 1500; i++) I.paso(g, I.bot(g));
  const r = I.resultado(g);
  eq('resultado: claves', Object.keys(r).sort(), ['disparos', 'kills', 'oleada', 'puntos', 'ticks']);
  eq('resultado: coincide con la partida', [r.puntos, r.ticks, r.disparos], [g.puntos, g.tick, g.disparos]);
  check('ritmo de puntos plausible (≤45 puntos/s)', r.puntos / (r.ticks / 60) <= 45, String(r.puntos / (r.ticks / 60)));
}

console.log(`\nMotor de Invasores espaciales: ${ok} comprobaciones correctas, ${ko} fallidas`);
process.exit(ko ? 1 : 0);
