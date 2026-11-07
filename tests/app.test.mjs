// Pruebas automáticas de la app Invasores espaciales (IT Canarias): interfaz en móvil, horizontal y tablet, partidas completas,
// controles, récords, copia de seguridad, idiomas y reto en línea contra una copia local del servidor común.
// Se ejecutan en GitHub antes de compilar: si alguna falla, no se publica la versión.
// Uso local: node tests/app.test.mjs   (para la parte en línea busca el servidor en ../juegos-servidor o en JUEGOS_SERVIDOR)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let passed = 0, failed = 0;
const check = (name, cond, extra = '') => { if (cond) { passed++; console.log('  ✓ ' + name); } else { failed++; console.log('  ✗ ' + name + (extra ? ' → ' + extra : '')); } };

const ROOT = fileURLToPath(new URL('../www/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  try { const f = await readFile(join(ROOT, path === '/' ? 'index.html' : path)); res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'text/html' }); res.end(f); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
const URL_APP = `http://localhost:${server.address().port}/`;
let browser;
try { browser = await chromium.launch(); } catch (e) { browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' }); }
const BASE_STATE = { onboarded: true, iosHint: true };

async function fresh(state, viewport, online = '', hooks = {}) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 412, height: 860 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true });
  await ctx.route('https://api.github.com/**', r => r.abort());
  await ctx.route('https://csuarezsm.github.io/**', r => r.abort());
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(u => { window.INVASORES_ONLINE_URL = u; }, online);          // en las pruebas, nunca el servidor real
  await p.addInitScript(h => { if (h.turbo) window.INV_TURBO = h.turbo; if (h.bot) window.INV_BOT = true; }, hooks);
  await p.addInitScript(st => { if (st && !sessionStorage.getItem('seeded')) { localStorage.setItem('invasores.v1', JSON.stringify(st)); sessionStorage.setItem('seeded', '1'); } }, state);
  await p.goto(URL_APP);
  return { p, ctx, errors };
}
const waitFor = (p, fn, arg, timeout = 15000) => p.waitForFunction(fn, arg, { timeout }).then(() => true, () => false);
const noHScroll = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const store = p => p.evaluate(() => JSON.parse(localStorage.getItem('invasores.v1')));
const G = p => p.evaluate(() => { const g = RUN.g; return g ? { x: g.cx, tick: g.tick, disparos: g.disparos, puntos: g.puntos, vidas: g.vidas, fin: g.fin, seed: g.seed, oleada: g.oleada } : null; });

/* ================= Pantalla de inicio ================= */
console.log('Pantalla de inicio');
{
  const { p, ctx, errors } = await fresh(BASE_STATE, null, 'ws://127.0.0.1:9/ws');
  check('abre en «Partida clásica» con los ajustes', await waitFor(p, () => document.querySelector('#aiStart') && document.querySelectorAll('[data-lv]').length === 3 && document.querySelector('#ivAuto') && document.querySelectorAll('[data-opt="ctrl"] button').length === 2));
  check('título Invasores', (await p.textContent('#title')).includes('Invasores'));
  check('tema por defecto oscuro (arcade)', await p.evaluate(() => { const c = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || document.documentElement.style.getPropertyValue('--bg'); return c === '#050a05'; }));
  check('sin desbordamiento horizontal', await noHScroll(p));
  check('hay pestaña «Reto en línea»', (await p.textContent('.modes')).includes('Reto en línea'));
  check('el récord empieza en 0000', (await p.textContent('#ivRec')).trim() === '0000');
  await p.click('[data-lv="3"]');
  check('cambiar la dificultad cambia su descripción', /más rápidos/.test(await p.textContent('#lvDesc')));
  await p.click('[data-lv="1"]');
  check('descripción del nivel fácil', /lentas/.test(await p.textContent('#lvDesc')));
  await p.click('[data-opt="ctrl"] button[data-v="botones"]'); await p.click('#ivAuto');
  let st = await store(p);
  check('recuerda mando y disparo automático', st.ctrl === 'botones' && st.autofire === false, JSON.stringify([st.ctrl, st.autofire]));
  await p.click('[data-opt="ctrl"] button[data-v="dedo"]'); await p.click('#ivAuto');
  await p.click('#menuBtn');
  check('el menú tiene historial, reglas, colores, idioma, borrar, compartir y más juegos', await waitFor(p, () => ['mArch', 'mGameRules', 'mTheme', 'mLang', 'mWipe', 'mShareApp', 'mMas', 'mAbout', 'mImp'].every(i => document.getElementById(i))));
  await p.click('#mGameRules');
  const reglas = await p.textContent('.sheet');
  check('las reglas explican puntos, platillo, escudos y vida extra', /30/.test(reglas) && /Platillo/.test(reglas) && /escudos/.test(reglas) && /1500/.test(reglas) && /1978/.test(reglas));
  await p.click('#grHands');
  check('«los invasores» lista 3 filas y el platillo', await waitFor(p, () => document.querySelectorAll('.sheet .hrow').length === 4));
  await p.click('#cdOk');
  await p.click('#menuBtn'); await p.click('#mTheme');
  const bgAntes = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  await p.click('[data-theme="claro"]');
  check('cambiar el tema se aplica al momento', await waitFor(p, b => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() !== b, bgAntes));
  check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
{
  const { p, ctx } = await fresh({ iosHint: true });
  check('la primera vez sale la bienvenida', await waitFor(p, () => document.querySelector('#wbNext')));
  for (let k = 0; k < 3; k++) await p.click('#wbNext');
  await p.click('#wbNext');
  check('la bienvenida se cierra y no vuelve', await waitFor(p, () => document.querySelector('#modal').classList.contains('hidden')) && (await store(p)).onboarded === true);
  await ctx.close();
}

/* ================= Partida clásica: controles ================= */
console.log('Controles');
{
  const { p, ctx, errors } = await fresh(BASE_STATE);
  await p.click('#aiStart');
  check('empieza la partida con el campo y el HUD', await waitFor(p, () => document.querySelector('#ivC') && document.querySelector('#ivP') && document.querySelector('#ivPause')));
  check('el campo es 224×256', await p.evaluate(() => { const c = document.querySelector('#ivC'); return c.width === 224 && c.height === 256; }));
  await p.waitForTimeout(1200);
  const g0 = await G(p);
  check('la partida avanza sola y dispara solo', g0 && g0.tick > 30 && g0.disparos > 0, JSON.stringify(g0));
  // arrastrar el dedo: el cañón sigue al dedo
  const box = await p.evaluate(() => { const r = document.querySelector('#ivC').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const alX = f => box.x + box.w * f, enY = box.y + box.h * 0.9;
  await p.mouse.move(alX(0.5), enY); await p.mouse.down(); await p.mouse.move(alX(0.12), enY, { steps: 6 });
  const okIzq = await waitFor(p, () => RUN.g.cx < 60, null, 9000);
  const izq = await G(p);
  check('arrastrar a la izquierda mueve el cañón', okIzq, String(izq.x));
  await p.mouse.move(alX(0.9), enY, { steps: 6 });
  const okDer = await waitFor(p, () => RUN.g.cx > 140, null, 9000);
  const der = await G(p);
  check('arrastrar a la derecha lo mueve', okDer, String(der.x));
  await p.mouse.up();
  // la zona de abajo (el dedo no tapa el juego)
  const pad = await p.evaluate(() => { const r = document.querySelector('#ivPad').getBoundingClientRect(); return { x: r.left, y: r.top + r.height / 2, w: r.width }; });
  check('hay una zona táctil libre bajo el campo', pad.w > 200 && await p.evaluate(() => document.querySelector('#ivPad').getBoundingClientRect().top >= document.querySelector('#ivC').getBoundingClientRect().bottom));
  await p.mouse.move(pad.x + pad.w * 0.5, pad.y); await p.mouse.down(); await p.mouse.move(pad.x + pad.w * 0.1, pad.y, { steps: 5 });
  check('arrastrar en la zona de abajo mueve el cañón', await waitFor(p, () => RUN.g.cx < 50, null, 9000));
  await p.mouse.move(pad.x + pad.w * 0.95, pad.y, { steps: 5 });
  check('y a la derecha', await waitFor(p, () => RUN.g.cx > 150, null, 9000));
  await p.mouse.up();
  // pausa
  await p.click('#ivPause'); await p.waitForTimeout(200);
  const t1 = (await G(p)).tick; await p.waitForTimeout(500);
  check('la pausa detiene la partida', (await G(p)).tick === t1);
  await p.click('#ivPause'); await p.waitForTimeout(500);
  check('al seguir, la partida avanza', (await G(p)).tick > t1);
  // teclado
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(1500); await p.keyboard.up('ArrowLeft');
  check('las flechas del teclado mueven el cañón', (await G(p)).x < der.x - 40);
  check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
{
  // botones ◀ ▶ y disparo manual
  const { p, ctx, errors } = await fresh({ ...BASE_STATE, ctrl: 'botones', autofire: false });
  await p.click('#aiStart');
  check('con botones salen ◀ ▶ y DISPARO', await waitFor(p, () => document.querySelector('#ivL') && document.querySelector('#ivRt') && document.querySelector('#ivF')));
  await p.waitForTimeout(500);
  check('sin disparo automático, no dispara solo', (await G(p)).disparos === 0);
  const box = async id => p.evaluate(i => { const r = document.getElementById(i).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, id);
  let b = await box('ivF'); await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.waitForTimeout(300); await p.mouse.up();
  check('el botón DISPARO dispara', (await G(p)).disparos >= 1);
  const x0 = (await G(p)).x;
  b = await box('ivL'); await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.waitForTimeout(800); await p.mouse.up();
  const x1 = (await G(p)).x;
  check('◀ mueve el cañón a la izquierda', x1 < x0 - 20, x0 + ' → ' + x1);
  b = await box('ivRt'); await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.waitForTimeout(800); await p.mouse.up();
  check('▶ lo mueve a la derecha', (await G(p)).x > x1 + 20);
  await p.keyboard.press('Space'); await p.waitForTimeout(200);
  check('la barra espaciadora dispara', (await G(p)).disparos >= 2);
  check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ================= Partida completa, récord e historial ================= */
console.log('Partida completa');
{
  const { p, ctx, errors } = await fresh(BASE_STATE, null, '', { turbo: 25, bot: true });
  await p.click('[data-lv="2"]'); await p.click('#aiStart');
  check('la partida termina y sale el resultado', await waitFor(p, () => !document.querySelector('#ivOv').classList.contains('hidden') && document.querySelector('#unAgain'), null, 120000));
  const st = await store(p);
  const a = st.archive[0];
  check('se guarda en el historial', st.archive.length === 1 && a.mode === 'solo' && a.nivel === 2 && a.puntos > 0, JSON.stringify(a));
  check('el récord queda guardado', st.best && st.best[2] === a.puntos);
  check('el resultado enseña los puntos', (await p.textContent('#ivOv')).includes(String(a.puntos).padStart(4, '0')));
  check('el primer resultado es récord nuevo', /récord/i.test(await p.textContent('#ivOv')));
  await p.click('#unAgain');
  check('«Otra partida» empieza otra', await waitFor(p, () => RUN.g && RUN.g.tick < 600 && !RUN.g.fin && document.querySelector('#ivPause')));
  await p.evaluate(() => { S.game = null; render(); });
  check('el récord se ve en el inicio', await waitFor(p, v => document.querySelector('#ivRec') && document.querySelector('#ivRec').textContent.trim() === v, String(a.puntos).padStart(4, '0')));
  await p.click('#menuBtn'); await p.click('#mArch');
  check('el historial lista la partida', await waitFor(p, () => document.querySelectorAll('.sheet .hrow').length >= 1));
  await p.click('#arOk');
  check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ================= Copia de seguridad ================= */
console.log('Copia de seguridad');
{
  const { p, ctx } = await fresh({ ...BASE_STATE, best: { 1: 0, 2: 1234, 3: 0 }, archive: [{ id: 'abc', created: 1, finished: 2, mode: 'solo', nivel: 2, puntos: 1234, oleada: 3, n: 1, nombres: ['Tú'], orden: [0], yo: 0, place: 1 }] });
  await p.click('#menuBtn'); await p.click('#mArch');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#arBk')]);
  const f = await dl.path(); const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  check('la copia lleva el historial y los récords', j.app === 'invasores' && j.archive.length === 1 && j.best[2] === 1234);
  await p.click('#arOk');
  await p.evaluate(() => { S.archive = []; S.best = {}; save(); });
  await p.reload(); await p.waitForTimeout(300);
  await p.click('#menuBtn');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#mImp')]);
  await fc.setFiles(f);
  await p.click('#cOk');
  check('importar la copia recupera historial y récord', await waitFor(p, () => { const s = JSON.parse(localStorage.getItem('invasores.v1')); return s.archive.length === 1 && s.best && s.best[2] === 1234; }));
  const malo = '/tmp/invasores-malo.json'; fs.writeFileSync(malo, JSON.stringify({ app: 'invasores', archive: [{ id: '<img>', n: 99 }, { id: 'ok', n: 2, nombres: ['x', 'y'], orden: [0, 0] }] }));
  await p.click('#menuBtn');
  const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('#mImp')]);
  await fc2.setFiles(malo); await p.waitForTimeout(200);
  check('una copia con datos inválidos no mete nada', /0 partidas/.test(await p.textContent('.sheet')));
  await p.click('#cNo');
  await ctx.close();
}

/* ================= Idiomas ================= */
console.log('Idiomas');
for (const [lang, play, rules] of [['en', /Play/, /Rules/], ['fr', /Jouer/, /Règles/], ['de', /Spielen/, /Regeln/], ['it', /Gioca/, /Regole/]]) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await ctx.route('https://**', r => r.abort());
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(([l, st]) => { window.INVASORES_ONLINE_URL = ''; if (!sessionStorage.getItem('seeded')) { localStorage.setItem('idioma', l); localStorage.setItem('invasores.v1', JSON.stringify(st)); sessionStorage.setItem('seeded', '1'); } }, [lang, BASE_STATE]);
  await p.goto(URL_APP);
  await waitFor(p, () => document.querySelector('#aiStart'));
  await p.waitForTimeout(300);
  check(`[${lang}] el botón de jugar está traducido`, play.test(await p.textContent('#aiStart')), await p.textContent('#aiStart'));
  await p.click('#menuBtn'); await p.click('#mGameRules'); await p.waitForTimeout(300);
  const t = await p.textContent('.sheet');
  check(`[${lang}] las reglas están traducidas`, rules.test(t) && !/Objetivo|Tu cañón|Los invasores/.test(t), t.slice(0, 80));
  check(`[${lang}] sin errores de JavaScript`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ================= Pantallas ================= */
console.log('Pantallas');
for (const [nombre, vp] of [['móvil horizontal', { width: 844, height: 390 }], ['tablet', { width: 820, height: 1180 }], ['móvil pequeño', { width: 360, height: 640 }]]) {
  const { p, ctx, errors } = await fresh(BASE_STATE, vp);
  check(`${nombre}: el inicio no desborda`, await noHScroll(p));
  await p.click('#aiStart');
  await waitFor(p, () => document.querySelector('#ivC'));
  await p.waitForTimeout(800);
  check(`${nombre}: sin desbordamiento horizontal en la partida`, await noHScroll(p));
  const r = await p.evaluate(() => { const c = document.querySelector('#ivC').getBoundingClientRect(); return { w: c.width, h: c.height, l: c.left, r: c.right, t: c.top, b: c.bottom, ih: innerHeight, iw: innerWidth }; });
  check(`${nombre}: el campo cabe en pantalla`, r.l >= 0 && r.r <= r.iw + 1 && r.w >= 120, JSON.stringify(r));
  check(`${nombre}: el campo se ve entero (alto)`, r.b <= r.ih + 1, JSON.stringify(r));
  check(`${nombre}: sin errores de JavaScript`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ================= Reto en línea (contra una copia local del servidor común) ================= */
console.log('Reto en línea');
{
  const SERV = process.env.JUEGOS_SERVIDOR || fileURLToPath(new URL('../../juegos-servidor/', import.meta.url));
  let serverOk = false, crearServidor, PS;
  if (fs.existsSync(join(SERV, 'src/juegos/invasores.js'))) {
    try {
      Object.assign(process.env, { PASO_BOT_MS: '5', AUSENTE_MS: '600', LIMITE_MSG: '20000', INVASORES_MAX_PTS_SEG: '1000000', DATA_DIR: fs.mkdtempSync(join(process.env.TMPDIR || '/tmp', 'juegos-')) });
      const cr = createRequire(join(SERV, 'package.json'));
      ({ crearServidor } = cr('./src/server.js'));
      serverOk = true;
    } catch (e) { console.log('  (no se pudo cargar el servidor: ' + e.message + ')'); }
  } else console.log('  ⚠ El servidor común todavía no tiene Invasores (src/juegos/invasores.js): se omite la parte en línea. Sube antes el servidor y vuelve a ejecutar.');
  if (serverOk) {
    const { server: PSrv } = crearServidor(); PS = PSrv;
    await new Promise(r => PS.listen(0, '127.0.0.1', r));
    const WS = `ws://127.0.0.1:${PS.address().port}/ws`;
    const A = await fresh({ ...BASE_STATE, online: { nombre: 'Carlos', token: 'a'.repeat(18) } }, null, WS, { turbo: 12, bot: true });
    const B = await fresh({ ...BASE_STATE, online: { nombre: 'Mari', token: 'b'.repeat(18) } }, { width: 390, height: 844 }, WS, { turbo: 12, bot: true });
    await A.p.click('[data-mode="online"]');
    check('la pestaña del reto conecta', await waitFor(A.p, () => /Conectado/.test(document.body.textContent)));
    await A.p.click('[data-opt="nivel"] button[data-v="facil"]');
    await A.p.click('#onCreate');
    check('se crea el reto y sale el código', await waitFor(A.p, () => document.querySelector('.on-code')));
    const code = (await A.p.textContent('.on-code')).trim();
    check('el código tiene 4 caracteres', /^[A-Z0-9]{4}$/.test(code));
    check('la sala enseña la dificultad elegida', /Fácil/.test(await A.p.textContent('.sec')));
    check('con un solo jugador no se puede empezar', await A.p.evaluate(() => document.querySelector('#onStart').disabled));
    await B.p.click('[data-mode="online"]');
    await waitFor(B.p, () => /Conectado/.test(document.body.textContent));
    await B.p.fill('#onCode', 'ZZZZ'); await B.p.click('#onJoin');
    check('un código que no existe da error y no entra', await waitFor(B.p, () => /no existe|No existe|no se encuentra|No hay/.test(document.body.textContent) || !!document.querySelector('#onJoin')) && !(await B.p.$('.on-code')));
    await B.p.fill('#onCode', code); await B.p.click('#onJoin');
    check('el segundo jugador entra', await waitFor(A.p, () => document.querySelectorAll('.on-seat').length === 2));
    check('ya se puede empezar', await waitFor(A.p, () => !document.querySelector('#onStart').disabled));
    await A.p.click('#onStart');
    check('empieza el reto en los dos móviles', await waitFor(A.p, () => document.querySelector('#ivC') && RUN.g, null, 20000) && await waitFor(B.p, () => document.querySelector('#ivC') && RUN.g, null, 20000));
    const ga = await G(A.p), gb = await G(B.p);
    check('los dos juegan la misma oleada (misma semilla)', ga.seed === gb.seed && ga.seed > 0, ga.seed + ' vs ' + gb.seed);
    check('hay una cuenta atrás antes de jugar', await A.p.evaluate(() => RUN.cuenta > 0 || RUN.g.tick < 300));
    check('se ve la clasificación en vivo', await waitFor(A.p, () => document.querySelectorAll('#ivRank .rk').length === 2));
    const fin = () => document.querySelector('#ivOv') && !document.querySelector('#ivOv').classList.contains('hidden') || document.querySelector('.on-final, #onRe');
    check('el reto termina para los dos', await waitFor(A.p, () => !!document.querySelector('#onRe'), null, 150000) && await waitFor(B.p, () => !!document.querySelector('#onRe'), null, 150000));
    const pA = await A.p.evaluate(() => document.body.innerText), pB = await B.p.evaluate(() => document.body.innerText);
    const nums = t => (t.match(/\b\d{4}\b/g) || []).sort().join(',');
    check('los dos ven la clasificación final con los mismos puntos', /clasificaci[oó]n final/i.test(pA + pB) && nums(pA) === nums(pB), nums(pA) + ' / ' + nums(pB));
    const arA = (await store(A.p)).archive, arB = (await store(B.p)).archive;
    check('el reto se guarda en el historial de cada uno', arA.some(a => a.mode === 'online' && a.n === 2) && arB.some(a => a.mode === 'online' && a.n === 2));
    check('quien más puntos tiene queda primero', await A.p.evaluate(() => { const a = S.archive.find(x => x.mode === 'online'); return a && a.puntosAll && a.puntosAll[a.orden[0]] >= a.puntosAll[a.orden[1]]; }));
    await A.p.click('#onRe'); await B.p.click('#onRe');
    check('la revancha reparte otro reto con otra oleada', await waitFor(A.p, s => document.querySelector('#ivC') && RUN.g && RUN.g.seed !== s, ga.seed, 20000));
    check('sin errores de JavaScript (Carlos)', A.errors.length === 0, A.errors.join(' | '));
    check('sin errores de JavaScript (Mari)', B.errors.length === 0, B.errors.join(' | '));
    await A.ctx.close(); await B.ctx.close(); PS.close();
  }
}

await browser.close(); server.close();
console.log(`\n${passed} correctas, ${failed} fallidas`);
process.exit(failed ? 1 : 0);
