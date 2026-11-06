// Genera las capturas y gráficos para la ficha de Google Play.
// Uso (desde la raíz del repo): node play-store/capturas.mjs [movil|tablet7|tablet10]
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = ROOT + 'play-store/';
const APP = 'file://' + ROOT + 'www/index.html';
let b; try { b = await chromium.launch(); } catch (e) { b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' }); }

// Datos de ejemplo: partidas terminadas para el historial y los récords
const seed = () => {
  const names = ['Carlos', 'Tere', 'Aitor', 'Lola', 'Nieves', 'Domingo']; let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const base = new Date(2026, 9, 1, 20).getTime();
  S.best = { 1: 1890, 2: 2640, 3: 1720 };
  for (let i = 0; i < 24; i++) {
    const online = i % 3 === 0, n = online ? 2 + Math.floor(rnd() * 5) : 1, nivel = 1 + Math.floor(rnd() * 3);
    const pts = Array.from({ length: n }, () => 400 + Math.floor(rnd() * 22) * 100 + 10 * Math.floor(rnd() * 10));
    const orden = [...Array(n).keys()].sort((a, c) => pts[c] - pts[a]);
    S.archive.unshift({ id: 'demo' + i, created: base + i * 864e5 / 2, finished: base + i * 864e5 / 2 + 400e3, mode: online ? 'online' : 'solo', nivel, puntos: pts[0], oleada: 2 + Math.floor(rnd() * 4),
      n, nombres: names.slice(0, n), orden, yo: 0, place: orden.indexOf(0) + 1, puntosAll: online ? pts : undefined, motivo: 'invadida' });
  }
  save();
};
// Prepara cada pantalla dentro de la app (se ejecuta en el navegador)
const setup = async (name) => {
  const avanzar = (g, n) => { for (let i = 0; i < n && !g.fin; i++) I.paso(g, I.bot(g)); };
  const jugar = (ticks) => {
    S.draft.ai = Object.assign(S.draft.ai, { nivel: 2 }); startAi();
    const g = S.game.g; avanzar(g, ticks); RUN.pausa = true; return g;
  };
  if (name === '1-partida') jugar(900);
  if (name === '2-partida') jugar(2600);
  if (name === '3-inicio') { S.game = null; S.draft.mode = 'ai'; render(); }
  if (name === '4-final') { S.draft.ai = Object.assign(S.draft.ai, { nivel: 2 }); startAi(); const g = S.game.g; avanzar(g, 60 * 60 * 12); }
  if (name === '5-historial') { S.game = null; render(); openArchive(); }
};
const SHOTS = ['1-partida', '2-partida', '3-inicio', '4-final', '5-historial'];
const SIZES = [
  ['movil', 405, 720, 1080 / 405],
  ['tablet7', 600, 960, 2],
  ['tablet10', 1280, 800, 1.5],
];
const only = process.argv[2];
for (const [dev, w, h, dsf] of SIZES) {
  if (only && only !== dev) continue;
  for (const name of SHOTS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, isMobile: dev === 'movil', hasTouch: true });
    const p = await ctx.newPage();
    await p.addInitScript(() => { window.INVASORES_ONLINE_URL = ''; }); await p.addInitScript(() => { if (!sessionStorage.s) { localStorage.setItem('invasores.v1', JSON.stringify({ onboarded: true, iosHint: true })); sessionStorage.s = 1; } });
    await p.goto(APP); await p.evaluate(seed); await p.evaluate(setup, name); await p.evaluate(() => document.querySelector('#toast') && document.querySelector('#toast').classList.remove('on')); await p.waitForTimeout(name === '4-final' ? 900 : 500);
    await p.screenshot({ path: `${OUT}${dev}-${name}.png` });
    await ctx.close();
  }
}
// Icono 512 y gráfico destacado 1024×500
const p = await b.newPage({ viewport: { width: 512, height: 512 } });
await p.setContent(`<img src="data:image/png;base64,${readFileSync(ROOT + 'assets/icon-only.png').toString('base64')}" style="width:512px;height:512px;display:block">`);
await p.screenshot({ path: OUT + 'icono-512.png', clip: { x: 0, y: 0, width: 512, height: 512 } });
const q = await b.newPage({ viewport: { width: 1024, height: 500 } });
await q.setContent(`<html><body style="margin:0;width:1024px;height:500px;background:radial-gradient(circle at 30% 50%,#0f2a0f,#050a05 70%);font-family:ui-monospace,Menlo,Consolas,monospace;display:flex;align-items:center;gap:56px;padding:0 70px;box-sizing:border-box;color:#e6ffe6">
  <img src="data:image/png;base64,${readFileSync(ROOT + 'assets/icon-only.png').toString('base64')}" style="width:300px;height:300px;border-radius:64px;box-shadow:0 18px 50px rgba(0,0,0,.6)">
  <div><div style="font-size:78px;font-weight:900;letter-spacing:2px;color:#4cff4c;line-height:1.05">INVASORES<br>ESPACIALES</div>
  <div style="font-size:31px;font-weight:600;margin-top:18px;line-height:1.3">El arcade de siempre,<br>en solitario o en línea con amigos</div>
  <div style="font-size:24px;color:#8fbf8f;margin-top:18px">3 dificultades · Reto de 2 a 6 · Sin anuncios</div></div></body></html>`, { waitUntil: 'domcontentloaded' });
await q.waitForTimeout(500);
await q.screenshot({ path: OUT + 'grafico-destacado-1024x500.png' });
await b.close();
console.log('Listo: play-store/');
