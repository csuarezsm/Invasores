/* Invasores espaciales — partida, pantalla de inicio y reto en línea (IT Canarias)
   © 2026 IT Canarias. Todos los derechos reservados. */
'use strict';
const I = window.Invasores;
const LEVELS = { 1: { name: 'Fácil', desc: 'Bombas más lentas y menos frecuentes. Para empezar.' },
  2: { name: 'Normal', desc: 'El ritmo del clásico de 1978.' },
  3: { name: 'Difícil', desc: 'Invasores más rápidos y bombardeo intenso.' } };
const NIVEL_ID = { 1: 'facil', 2: 'normal', 3: 'dificil' };
// Servidor de juegos en línea (repo csuarezsm/juegos-servidor). Vacío = la opción «Reto en línea» no aparece.
const ONLINE_URL = 'INVASORES_ONLINE_URL' in window ? window.INVASORES_ONLINE_URL : 'wss://juegos.itcanarias.com/ws';
const botName = name => String(name || '').replace(/^🤖\s*/, '');
let AIT = null;                                       // (compatibilidad con el menú: temporizador pendiente)

/* ================= Sonidos (sintetizados: sin archivos de audio) ================= */
const Sound = (() => {
  let ctx = null, paso = 0;
  const ac = () => {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { ctx = new C(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };
  const out = c => (window.AudioSuave ? AudioSuave.salida(c) : c.destination);
  function tone(c, t, f0, f1, dur, vol, type) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out(c)); o.start(t); o.stop(t + dur + 0.02);
  }
  function ruido(c, t, dur, vol) {
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const s = c.createBufferSource(), g = c.createGain(); g.gain.value = vol; s.buffer = buf; s.connect(g); g.connect(out(c)); s.start(t);
  }
  function play(kind) {
    if (S.sound === false) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime + 0.005;
    try {
      if (kind === 'disparo') tone(c, t, 1100, 300, 0.09, 0.05);
      else if (kind === 'mata') { ruido(c, t, 0.12, 0.12); tone(c, t, 300, 80, 0.1, 0.05); }
      else if (kind === 'paso') { tone(c, t, [98, 87, 78, 73][paso++ & 3], 0, 0.1, 0.07, 'triangle'); }
      else if (kind === 'ufo') { tone(c, t, 880, 1180, 0.16, 0.04); }
      else if (kind === 'ufoHit') { [1300, 1000, 1500, 800].forEach((f, i) => tone(c, t + i * 0.07, f, f, 0.08, 0.05)); }
      else if (kind === 'muerte') { ruido(c, t, 0.7, 0.2); tone(c, t, 400, 40, 0.7, 0.05, 'sawtooth'); }
      else if (kind === 'escudo') ruido(c, t, 0.05, 0.06);
      else if (kind === 'extra' || kind === 'oleada') [523, 659, 784, 1046].forEach((f, i) => tone(c, t + i * 0.09, f, f, 0.12, 0.05));
      else if (kind === 'fin') [392, 330, 262, 196].forEach((f, i) => tone(c, t + i * 0.18, f, f, 0.25, 0.06));
      else if (kind === 'win') [523, 659, 784].forEach((f, i) => tone(c, t + i * 0.12, f, f, 0.3, 0.06, 'triangle'));
      else if (kind === 'cuenta') tone(c, t, 660, 660, 0.12, 0.05);
      else if (kind === 'ya') tone(c, t, 990, 990, 0.3, 0.06);
    } catch (e) {}
  }
  return { play };
})();

/* ================= Dibujo (píxeles propios, sin imágenes) ================= */
const SPR = {
  inv: [
    [['00111100', '01111110', '11011011', '11111111', '01111110', '00100100', '01000010', '10000001'],
     ['00111100', '01111110', '11011011', '11111111', '01111110', '01011010', '10000001', '01000010']],
    [['00100010000', '00010100000', '00111110000', '01101011000', '11111111100', '10111110100', '10100010100', '00011011000'],
     ['00100010000', '10010100100', '10111110100', '11101011100', '11111111100', '01111111000', '00100010000', '01000001000']],
    [['000011110000', '011111111110', '111111111111', '111001100111', '111111111111', '000110011000', '001101101100', '110000000011'],
     ['000011110000', '011111111110', '111111111111', '111001100111', '111111111111', '001110011100', '011001100110', '001100001100']]
  ],
  canon: ['0000001000000', '0000011100000', '0000011100000', '0111111111110', '1111111111111', '1111111111111', '1111111111111', '1111111111111'],
  ufo: ['0000011111100000', '0001111111111000', '0011111111111100', '0110110110110110', '1111111111111111', '0011100110011100', '0001000000001000'],
  boom: ['1001001001', '0100010010', '0010100100', '1101111011', '0010100100', '0100010010', '1001001001']
};
function pintar(ctx, rows, x, y, color) {
  ctx.fillStyle = color;
  for (let r = 0; r < rows.length; r++) { const f = rows[r]; for (let c = 0; c < f.length; c++) if (f[c] === '1') ctx.fillRect(Math.round(x) + c, Math.round(y) + r, 1, 1); }
}
function colores() {
  const cs = getComputedStyle(document.documentElement);
  return { fg: cs.getPropertyValue('--gold').trim() || '#4cff4c', rojo: cs.getPropertyValue('--red').trim() || '#ff5555', txt: cs.getPropertyValue('--txt').trim() || '#fff', mut: cs.getPropertyValue('--mut').trim() || '#888' };
}
function dibujar(g, cv, col, fx) {
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, I.W, I.H);
  // línea del suelo y estrellas fijas
  ctx.fillStyle = col.fg; ctx.fillRect(0, 240, I.W, 1);
  ctx.fillStyle = col.mut; for (let k = 0; k < 18; k++) ctx.fillRect((k * 53 + 17) % I.W, (k * 29 + 41) % 190 + 14, 1, 1);
  // invasores
  for (let r = 0; r < I.ROWS; r++) for (let c = 0; c < I.COLS; c++) if (g.inv[r * I.COLS + c]) pintar(ctx, SPR.inv[I.TIPO_FILA[r]][g.anim], I.invX(g, c, r), I.invY(g, r), col.fg);
  // escudos
  ctx.fillStyle = col.fg;
  for (let k = 0; k < I.ESC_N; k++) { const f = g.esc[k], ex = I.ESC_X0 + k * I.ESC_DX; for (let i = 0; i < 88; i++) if (f[i]) ctx.fillRect(ex + (i % 11) * 2, I.ESC_Y + Math.floor(i / 11) * 2, 2, 2); }
  // platillo, bomba, bala y cañón
  if (g.ufo) pintar(ctx, SPR.ufo, g.ufo.x, I.UFO_Y, col.rojo);
  for (const b of g.bombas) { ctx.fillStyle = col.txt; const z = Math.floor(b.y / 3) & 1; ctx.fillRect(b.x - 1 + z, b.y, 1, 2); ctx.fillRect(b.x - z, b.y + 2, 1, 2); ctx.fillRect(b.x - 1 + z, b.y + 4, 1, 1); }
  if (g.bala) { ctx.fillStyle = col.txt; ctx.fillRect(g.bala.x, g.bala.y, 1, 6); }
  if (g.muerto) { if (Math.floor(g.muerto / 6) & 1) pintar(ctx, SPR.boom, g.cx + 1.5, I.CANON_Y, col.rojo); else pintar(ctx, SPR.canon, g.cx, I.CANON_Y, col.rojo); }
  else if (!g.fin || g.motivo !== 'vidas') pintar(ctx, SPR.canon, g.cx, I.CANON_Y, col.fg);
  // vidas abajo
  for (let k = 0; k < Math.max(0, g.vidas - (g.muerto ? 0 : 0)) && k < 9; k++) pintar(ctx, SPR.canon, 8 + k * 16, 244, col.fg);
  // avisos flotantes (puntos del platillo)
  for (const f of fx) { ctx.fillStyle = col.rojo; ctx.font = '8px monospace'; ctx.fillText(String(f.t), f.x, f.y); }
}

/* ================= Estado de la partida en marcha ================= */
const RUN = { on: false, raf: 0, last: 0, acc: 0, cv: null, col: null, fx: [], inp: { x: null, dir: 0, fire: false }, g: null, modo: null, cuenta: 0, sentP: -1, sentT: 0, pausa: false, onFin: null };
const STEP_MS = 1000 / 60;
const ticksPorFrame = () => (typeof window.INV_TURBO === 'number' ? window.INV_TURBO : 1);
function modalAbierto() { const m = document.getElementById('modal'); return !!(m && !m.classList.contains('hidden')); }
function stopLoop() { RUN.on = false; cancelAnimationFrame(RUN.raf); RUN.raf = 0; clearTimeout(AIT); }
function startLoop() {
  stopLoop(); RUN.on = true; RUN.last = performance.now(); RUN.acc = 0;
  const bucle = ts => {
    if (!RUN.on) return;
    const dt = Math.min(100, ts - RUN.last); RUN.last = ts;
    const g = RUN.g;
    const parado = RUN.pausa || document.hidden || (modalAbierto() && RUN.modo === 'solo');
    if (RUN.cuenta > 0) { RUN.cuenta -= dt; const n = Math.ceil(RUN.cuenta / 1000); if (n !== RUN.nCuenta) { RUN.nCuenta = n; if (n > 0) Sound.play('cuenta'); else Sound.play('ya'); } cuentaTxt(); }
    else if (!parado && g && !g.fin) {
      RUN.acc += dt * (ticksPorFrame() > 1 ? 1 : 1);
      let n = 0;
      while (RUN.acc >= STEP_MS && n < 8) { RUN.acc -= STEP_MS; n++; paso1(); if (g.fin) break; }
      if (ticksPorFrame() > 1) for (let k = 1; k < ticksPorFrame() && !g.fin; k++) paso1();
    }
    if (g) { dibujar(g, RUN.cv, RUN.col, RUN.fx); hud(); }
    if (g && g.fin && !RUN.fin) { RUN.fin = true; terminar(); }
    if (RUN.on) RUN.raf = requestAnimationFrame(bucle);
  };
  RUN.raf = requestAnimationFrame(bucle);
}
function paso1() {
  const g = RUN.g;
  const bot = window.INV_BOT ? I.bot(g) : Object.assign({}, RUN.inp, { fire: RUN.inp.fire || RUN.inp.latch });   // INV_BOT solo lo usan las pruebas
  RUN.inp.latch = false;                                                  // un toque muy corto también dispara
  const ev = I.paso(g, bot);
  for (const e of ev) {
    if (e === 'disparo' || e === 'mata' || e === 'muerte' || e === 'ufoHit' || e === 'extra' || e === 'oleada') Sound.play(e);
    else if (e === 'paso') Sound.play('paso');
    else if (e === 'escudo') Sound.play('escudo');
    if (e === 'ufoHit' && g.ufoPuntos) RUN.fx.push({ t: g.ufoPuntos, x: Math.max(4, Math.min(190, I.W / 2)), y: 40, n: 50 });
    if (e === 'muerte') vibrate(120);
    if (e === 'fin') Sound.play('fin');
  }
  if (g.ufo && g.tick % 24 === 0) Sound.play('ufo');
  RUN.fx = RUN.fx.filter(f => --f.n > 0);
  if (RUN.modo === 'online' && ONG && !g.fin) { if (g.tick - RUN.sentT >= 90 && g.puntos !== RUN.sentP) { RUN.sentT = g.tick; RUN.sentP = g.puntos; onEnviar({ t: 'jugada', a: { tipo: 'progreso', puntos: g.puntos, oleada: g.oleada } }); } }
}
function cuentaTxt() { const el = $('#ivMsg'); if (!el) return; el.textContent = RUN.cuenta > 0 ? String(Math.ceil(RUN.cuenta / 1000)) : ''; el.classList.toggle('big', RUN.cuenta > 0); }
const vidasTxt = g => '♥'.repeat(Math.max(0, Math.min(9, g.vidas)));
function hud() {
  const g = RUN.g; if (!g) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el && el.textContent !== String(v)) el.textContent = v; };
  set('ivP', String(g.puntos).padStart(4, '0')); set('ivW', g.oleada); set('ivV', vidasTxt(g) || '—');
  set('ivR', String(Math.max(S.best ? (S.best[RUN.nivel] || 0) : 0, g.puntos)).padStart(4, '0'));
}

/* ================= Controles ================= */
function posX(ev, cv) { const r = cv.getBoundingClientRect(); return (ev.clientX - r.left) / r.width * I.W; }
function enlazarControles() {
  const cv = RUN.cv, inp = RUN.inp;
  let arrastra = false;
  cv.onpointerdown = ev => { if (S.ctrl === 'botones') return; arrastra = true; try { cv.setPointerCapture(ev.pointerId); } catch (e) {} inp.x = posX(ev, cv); ev.preventDefault(); };
  cv.onpointermove = ev => { if (arrastra) inp.x = posX(ev, cv); };
  cv.onpointerup = cv.onpointercancel = () => { arrastra = false; };
  inp.fire = false; inp.dir = 0;
  const hold = (id, fn) => { const b = document.getElementById(id); if (!b) return; const on = e => { fn(true); e.preventDefault(); }, off = () => fn(false); b.onpointerdown = on; b.onpointerup = b.onpointerleave = b.onpointercancel = off; };
  hold('ivL', v => { inp.x = null; inp.dir = v ? -1 : (inp.dir === -1 ? 0 : inp.dir); });
  hold('ivRt', v => { inp.x = null; inp.dir = v ? 1 : (inp.dir === 1 ? 0 : inp.dir); });
  hold('ivF', v => { inp.fire = v; if (v) inp.latch = true; });
  const teclas = {};
  window.onkeydown = ev => {
    if (!RUN.on || modalAbierto() || /INPUT|TEXTAREA/.test((ev.target || {}).tagName || '')) return;
    if (ev.key === 'ArrowLeft' || ev.key === 'a') { inp.x = null; inp.dir = -1; ev.preventDefault(); }
    else if (ev.key === 'ArrowRight' || ev.key === 'd') { inp.x = null; inp.dir = 1; ev.preventDefault(); }
    else if (ev.key === ' ' || ev.key === 'ArrowUp') { inp.fire = true; inp.latch = true; ev.preventDefault(); }
    else if ((ev.key === 'p' || ev.key === 'Escape') && RUN.modo === 'solo') togglePausa();
  };
  window.onkeyup = ev => {
    if (ev.key === 'ArrowLeft' || ev.key === 'a') { if (inp.dir === -1) inp.dir = 0; }
    else if (ev.key === 'ArrowRight' || ev.key === 'd') { if (inp.dir === 1) inp.dir = 0; }
    else if (ev.key === ' ' || ev.key === 'ArrowUp') inp.fire = false;
  };
}
function togglePausa() {
  if (RUN.modo !== 'solo' || !RUN.g || RUN.g.fin) return;
  RUN.pausa = !RUN.pausa;
  const b = $('#ivPause'); if (b) b.textContent = RUN.pausa ? '▶ Seguir' : '⏸ Pausa';
  const m = $('#ivMsg'); if (m) { m.textContent = RUN.pausa ? 'Pausa' : ''; m.classList.toggle('big', RUN.pausa); }
}

/* ================= Pantalla de inicio ================= */
function DEFAULTS() { S.ctrl = S.ctrl || 'dedo'; if (S.autofire == null) S.autofire = true; S.best = S.best || {}; }
function modeTabs() {
  const ms = [['ai', '👾 Partida clásica']].concat(ONLINE_URL ? [['online', '🌐 Reto en línea']] : []);
  return `<div class="kinds modes">${ms.map(([k, l]) => `<button data-mode="${k}" class="${S.draft.mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}
function bindModeTabs() { document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { S.draft.mode = b.dataset.mode; render(); }); }
const optBtns = (vals, cur, attr, lab) => `<span class="kinds" data-opt="${attr}" style="flex:none;width:64%;margin:0">${vals.map(v => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${esc(lab(v))}</button>`).join('')}</span>`;
function mandoHtml() {
  return `<label class="f"><span>Mando<em>Cómo mueves el cañón</em></span>${optBtns(['dedo', 'botones'], S.ctrl, 'ctrl', v => v === 'dedo' ? '👆 Arrastrar' : '◀ ▶ Botones')}</label>
    <label class="f"><span>Disparo automático<em>Dispara solo; tú solo apuntas</em></span><input type="checkbox" class="tg" id="ivAuto" ${S.autofire ? 'checked' : ''}></label>`;
}
function bindMando() {
  document.querySelectorAll('[data-opt="ctrl"] button').forEach(b => b.onclick = () => { S.ctrl = b.dataset.v; save(); document.querySelectorAll('[data-opt="ctrl"] button').forEach(x => x.classList.toggle('on', x === b)); });
  const a = $('#ivAuto'); if (a) a.onchange = () => { S.autofire = a.checked; save(); };
}
function renderSetup() {
  DEFAULTS(); stopLoop(); RUN.g = null; ONG = null;
  $('#title').firstChild.textContent = 'Invasores';
  if (S.draft.mode === 'online' && ONLINE_URL) return renderOnline();
  S.draft.mode = 'ai';
  const d = S.draft.ai;
  $('#subtitle').textContent = 'Partida clásica';
  const rec = S.best[d.nivel] || 0;
  $('#app').innerHTML = `${modeTabs()}
    <div class="sec" style="text-align:center"><div style="font-size:calc(56px * var(--fs, 1))">👾</div>
      <div class="mut">Defiende la Tierra. Tu récord en ${LEVELS[d.nivel].name}</div><div class="iv-rec" id="ivRec">${String(rec).padStart(4, '0')}</div></div>
    <div class="sec"><h2>Dificultad</h2>
      <div class="kinds lv" style="margin:0 0 8px">${[1, 2, 3].map(k => `<button data-lv="${k}" class="${d.nivel === k ? 'on' : ''}">${LEVELS[k].name}</button>`).join('')}</div>
      <div class="mut" id="lvDesc">${esc(LEVELS[d.nivel].desc)}</div></div>
    <div class="sec"><h2>Controles</h2>${mandoHtml()}</div>
    <button class="btn-gold" id="aiStart" style="width:100%;padding:16px;font-size:calc(18px * var(--fs, 1))">Jugar 👾</button>
    <div class="mut" style="text-align:center;margin:10px 0 20px">3 vidas · vida extra a los 1500 puntos · cada oleada es más rápida</div>`;
  bindModeTabs(); bindMando();
  document.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { d.nivel = +b.dataset.lv; save(); renderSetup(); });
  $('#aiStart').onclick = startAi;
}
function startAi() {
  const d = S.draft.ai;
  const seed = (Math.random() * 2 ** 31) | 0 || 1;
  S.game = { mode: 'solo', nivel: d.nivel, g: I.nueva({ seed, nivel: d.nivel, auto: S.autofire }), created: Date.now() };
  render(); keepAwake();
}

/* ================= La pantalla de juego (solo y reto) ================= */
function gameHtml(extra) {
  const bot = S.ctrl === 'botones';
  return `<div class="iv">
    <div class="iv-hud"><span>PUNTOS <b id="ivP">0000</b></span><span>RÉCORD <b id="ivR">0000</b></span><span>OLEADA <b id="ivW">1</b></span><span class="iv-v" id="ivV">♥♥♥</span></div>
    <div class="iv-wrap"><canvas id="ivC" class="iv-cv" width="${I.W}" height="${I.H}"></canvas><div id="ivMsg" class="iv-msg"></div><div id="ivOv" class="iv-ov hidden"></div></div>
    ${bot ? `<div class="iv-btns"><button id="ivL" class="btn-ghost">◀</button>${S.autofire ? '' : '<button id="ivF" class="btn-gold">DISPARO</button>'}<button id="ivRt" class="btn-ghost">▶</button></div>`
      : (S.autofire ? '' : '<div class="iv-btns"><button id="ivF" class="btn-gold">DISPARO</button></div>')}
    ${extra || ''}</div>`;
}
function montarJuego(g, modo, nivel, cuenta) {
  RUN.g = g; RUN.modo = modo; RUN.nivel = nivel; RUN.fx = []; RUN.fin = false; RUN.pausa = false; RUN.sentP = -1; RUN.sentT = 0;
  RUN.cv = $('#ivC'); RUN.col = colores(); RUN.cuenta = cuenta || 0; RUN.nCuenta = null;
  RUN.inp.x = null; RUN.inp.dir = 0; RUN.inp.fire = false;
  enlazarControles(); startLoop();
}
function renderGame() {
  const gm = S.game; if (!gm) return;
  if (RUN.g === gm.g && RUN.on) return;
  $('#subtitle').textContent = 'Partida clásica · ' + LEVELS[gm.nivel].name;
  $('#app').innerHTML = gameHtml('<div class="iv-btns" style="margin-top:2px"><button class="btn-ghost sm" id="ivPause">⏸ Pausa</button></div>');
  $('#ivPause').onclick = togglePausa;
  montarJuego(gm.g, 'solo', gm.nivel, 0);
}
function terminar() {
  const g = RUN.g;
  if (RUN.modo === 'solo') {
    const gm = S.game; if (!gm) return;
    const nuevo = g.puntos > (S.best[gm.nivel] || 0);
    if (nuevo) S.best[gm.nivel] = g.puntos;
    S.archive.unshift({ id: uid(), created: gm.created, finished: Date.now(), mode: 'solo', nivel: gm.nivel, puntos: g.puntos, oleada: g.oleada, n: 1, nombres: [S.lastName || 'Tú'], orden: [0], yo: 0, place: 1, motivo: g.motivo });
    if (S.archive.length > MAX_ARCHIVE) S.archive.length = MAX_ARCHIVE;
    save(); autoBackup(true);
    Sound.play(nuevo ? 'win' : 'fin');
    const ov = $('#ivOv'); if (!ov) return;
    ov.classList.remove('hidden');
    ov.innerHTML = `<div class="ov-t">${g.motivo === 'invadida' ? '¡Te han invadido!' : 'Fin de la partida'}</div>
      <div class="ov-n">${String(g.puntos).padStart(4, '0')}</div><div class="mut">${nuevo ? '🏆 ¡Nuevo récord!' : 'Récord: ' + String(S.best[gm.nivel] || 0).padStart(4, '0')} · oleada ${g.oleada}</div>
      <div class="acts" style="margin-top:12px"><button class="btn-gold" id="unAgain">🔁 Otra partida</button><button class="btn-ghost" id="unNew">Cambiar ajustes</button></div>`;
    $('#unAgain').onclick = () => { startAi(); };
    $('#unNew').onclick = () => { S.game = null; render(); };
    $('#subtitle').textContent = 'Partida terminada';
    const pb = $('#ivPause'); if (pb) pb.style.display = 'none';
  } else if (RUN.modo === 'online') {
    onEnviar({ t: 'jugada', a: { tipo: 'fin', puntos: g.puntos, oleada: g.oleada } });
    const ov = $('#ivOv'); if (ov) { ov.classList.remove('hidden'); ov.innerHTML = `<div class="ov-t">Has terminado</div><div class="ov-n">${String(g.puntos).padStart(4, '0')}</div><div class="mut">⏳ Esperando a los demás…</div>`; }
  }
}

/* ---------- Los invasores (puntos) ---------- */
function spriteUrl(rows, color) {
  const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
  pintar(c.getContext('2d'), rows, 0, 0, color); return c.toDataURL();
}
function openCards() {
  const col = colores();
  const fila = (rows, t, d) => `<div class="hrow" style="display:flex;align-items:center;gap:12px"><img src="${spriteUrl(rows, col.fg)}" alt="" style="width:48px;height:auto;image-rendering:pixelated;background:#000;padding:6px;border-radius:8px"><div class="hrow-t"><b>${esc(t)}</b><div class="mut">${esc(d)}</div></div></div>`;
  openModal(`<h3>👾 Los invasores</h3><div class="sub">Cuántos puntos vale cada uno.</div>
    ${fila(SPR.inv[0][0], '30 puntos', 'La fila de arriba.')}
    ${fila(SPR.inv[1][0], '20 puntos', 'Las dos filas del medio.')}
    ${fila(SPR.inv[2][0], '10 puntos', 'Las dos filas de abajo, las más cercanas.')}
    <div class="hrow" style="display:flex;align-items:center;gap:12px"><img src="${spriteUrl(SPR.ufo, col.rojo)}" alt="" style="width:48px;height:auto;image-rendering:pixelated;background:#000;padding:6px;border-radius:8px"><div class="hrow-t"><b>Platillo: 50 a 300</b><div class="mut">Cruza arriba de vez en cuando. Su valor depende de tus disparos.</div></div></div>
    <div class="mut" style="margin:10px 0">Un solo disparo en el aire a la vez. Los escudos se desgastan con los tuyos y con las bombas. Si los invasores llegan abajo, se acabó.</div>
    <div class="acts"><button class="btn-gold" id="cdOk">Entendido</button></div>`);
  $('#cdOk').onclick = closeModal;
}
const openHands = openCards;

/* ================= Reto en línea ================= */
let ONG = null;                                       // reto en marcha en este móvil: { id }
const ON = { recibido: 0, ws: null, estado: 'desconectado', sala: null, quiere: false, intentos: 0, timer: null, ping: null, listo: null, rolling: false };
function onToken() {
  S.online = S.online || {};
  if (!S.online.token) { const a = new Uint8Array(18); crypto.getRandomValues(a); S.online.token = Array.from(a, b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[b & 63]).join(''); save(); }
  return S.online.token;
}
const onNombre = () => (S.online && S.online.nombre) || '';
function onConectar() {
  if (!ONLINE_URL) return;
  ON.quiere = true;
  if (ON.ws && (ON.ws.readyState === 0 || ON.ws.readyState === 1)) return;
  clearTimeout(ON.timer);
  onSetEstado('conectando');
  let ws;
  try { ws = new WebSocket(ONLINE_URL); } catch (e) { onReintentar(); return; }
  ON.ws = ws;
  ws.onopen = () => {
    ON.intentos = 0; onSetEstado('conectado');
    ws.send(JSON.stringify({ t: 'hola', token: onToken(), nombre: onNombre() }));
    clearInterval(ON.ping); ON.ping = setInterval(() => onEnviar({ t: 'ping' }), 25000);
  };
  ws.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.t === 'hola') {
      if (!Array.isArray(m.juegos) || !m.juegos.includes('invasores')) { ON.listo = false; onSetEstado('preparando'); ON.ws = null; ws.close(); clearTimeout(ON.timer); if (ON.quiere) ON.timer = setTimeout(onConectar, 60000); return; }
      ON.listo = true; onSetEstado('conectado');
      return;
    }
    if (m.t === 'sala') { ON.listo = true; ON.recibido = Date.now(); onRecibirSala(m.sala); }
    else if (m.t === 'lista') Publicas.recibir(m);
    else if (m.t === 'error') { ON.rolling = false; if (!Publicas.error(m)) toast(m.msg); }
    else if (m.t === 'fuera') { toast(m.motivo || 'Has salido del reto'); onRecibirSala(null); }
  };
  ws.onclose = () => { if (ON.ws !== ws) return; clearInterval(ON.ping); ON.ws = null; onSetEstado('desconectado'); if (ON.quiere) onReintentar(); };
  ws.onerror = () => {};
}
function onReintentar() { clearTimeout(ON.timer); const ms = Math.min(15000, 1000 * 2 ** ON.intentos++); ON.timer = setTimeout(onConectar, ms); }
function onEnviar(m) {
  if (!ON.ws || ON.ws.readyState !== 1) { if (m.t !== 'ping' && m.a && m.a.tipo !== 'progreso') toast('Sin conexión con el servidor. Reintentando…'); onConectar(); return false; }
  ON.ws.send(JSON.stringify(m)); return true;
}
function onSetEstado(e) {
  if (e === 'desconectado' && ON.listo === false) e = 'preparando';
  ON.estado = e;
  document.querySelectorAll('#onJoin, #onCreate').forEach(b => { b.disabled = e === 'preparando'; });
  const el = $('#onStatus'); if (el) el.innerHTML = onEstadoHtml();
}
const onEstadoHtml = () => ({ conectado: '🟢 Conectado', conectando: '🟡 Conectando…', desconectado: '🔴 Sin conexión · reintentando', preparando: '🛠 El reto en línea estará disponible muy pronto' })[ON.estado];
document.addEventListener('visibilitychange', () => { if (!document.hidden && ON.quiere && ON.estado !== 'conectado') { ON.intentos = 0; onConectar(); } });

function onRecibirSala(sala) {
  const antes = ON.sala;
  ON.sala = sala;
  S.online = S.online || {}; S.online.enSala = !!sala; save();
  if (!sala && !antes) return;
  if (S.game) return;
  // en pleno juego no se redibuja la pantalla: solo la clasificación en vivo
  if (sala && sala.estado === 'jugando' && ONG && ONG.id === sala.codigo + ':' + sala.partida.seed) { rankHtml(sala.partida); return; }
  render();
}
function archivarReto(sala) {
  const p = sala.partida; if (!p || !p.partida) return;
  const pa = p.partida, id = 'on-' + pa.id;
  if (S.archive.some(a => a.id === id)) return;
  const place = pa.orden.indexOf(p.yo) + 1;
  S.archive.unshift({ id, created: pa.created, finished: Date.now(), mode: 'online', nivel: p.nivel, puntos: p.yo == null ? 0 : pa.puntos[p.yo], oleada: p.yo == null ? 1 : pa.oleadas[p.yo], n: pa.nombres.length, nombres: pa.nombres.map(botName), orden: pa.orden.slice(), yo: p.yo == null ? 0 : p.yo, place, puntosAll: pa.puntos.slice() });
  if (S.archive.length > MAX_ARCHIVE) S.archive.length = MAX_ARCHIVE;
  Sound.play(place === 1 ? 'win' : 'fin'); save(); autoBackup(true);
}
function renderOnline() {
  S.online = S.online || {};
  if (!ON.quiere) onConectar();
  const s = ON.sala;
  if (!s) return onRenderInicio();
  if (s.estado === 'espera') return onRenderEspera(s);
  return onRenderMesa(s);
}
function onRenderInicio() {
  $('#subtitle').textContent = 'Reto en línea';
  const o = Object.assign({ nivel: 'normal' }, (S.online && S.online.opciones) || {});
  $('#app').innerHTML = `${modeTabs()}
    <div class="sec"><div class="mut">Todos juegan a la vez, cada uno en su móvil, <b>la misma oleada</b>. Gana quien más puntos consigue.</div></div>
    <div class="sec"><h2>Tu nombre</h2>
      <input id="onName" maxlength="18" placeholder="Cómo te verán los demás" value="${esc(onNombre())}" autocomplete="off" style="width:100%"></div>
    ${Publicas.html(false)}
    <div class="sec"><h2>Unirse a un reto</h2>
      <div class="mut" style="margin-bottom:8px">Pide el código a quien lo ha creado.</div>
      <div class="row" style="gap:8px"><input id="onCode" maxlength="4" placeholder="Código" value="${esc((S.online && S.online.codigo) || '')}" autocomplete="off" autocapitalize="characters" style="flex:1;min-width:0;width:auto;text-transform:uppercase">
      <button class="btn-gold" id="onJoin" style="flex:1;min-width:0" ${ON.estado === 'preparando' ? 'disabled' : ''}>Unirse</button></div></div>
    <div class="sec"><h2>Crear un reto</h2>
      <label class="f"><span>Dificultad</span>${optBtns(['facil', 'normal', 'dificil'], o.nivel, 'nivel', v => ({ facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' })[v])}</label>
      ${mandoHtml()}
      ${Publicas.casilla()}
      <button class="btn-gold" id="onCreate" style="width:100%;margin-top:8px" ${ON.estado === 'preparando' ? 'disabled' : ''}>Crear reto</button></div>
    <div class="mut" style="text-align:center;margin:0 0 4px">De 2 a 6 jugadores. Tu puntuación sale de tu partida; el servidor comprueba que sea posible. Es un reto entre amigos.</div>
    <div class="mut" id="onStatus" style="text-align:center;margin:6px 0 20px">${onEstadoHtml()}</div>`;
  bindModeTabs(); bindMando();
  const nameOk = () => { const n = cleanName($('#onName').value).slice(0, 18); if (!n) { toast('Escribe tu nombre'); $('#onName').focus(); return null; } S.online.nombre = n; save(); return n; };
  $('#onName').onchange = () => { S.online.nombre = cleanName($('#onName').value).slice(0, 18); save(); };
  document.querySelectorAll('[data-opt="nivel"] button').forEach(b => b.onclick = () => b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)));
  $('#onCode').oninput = e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  $('#onJoin').onclick = () => {
    const n = nameOk(); if (!n) return;
    const c = $('#onCode').value.trim().toUpperCase(); if (c.length !== 4) { toast('El código tiene 4 letras o números'); return; }
    onEnviar({ t: 'unirse', codigo: c, nombre: n });
  };
  const leerOpciones = () => { const b = document.querySelector('[data-opt="nivel"] .on'); const opciones = { nivel: b ? b.dataset.v : 'normal' }; S.online.opciones = opciones; save(); return opciones; };
  $('#onCreate').onclick = () => { const n = nameOk(); if (!n) return; onEnviar({ t: 'crear', juego: 'invasores', opciones: leerOpciones(), publica: Publicas.marcada(), nombre: n }); };
  Publicas.montar({ juego: 'invasores', enviar: onEnviar, nombre: nameOk, opciones: leerOpciones, conectado: () => ON.estado === 'conectado', conMaquina: false });
}
function onRenderEspera(s) {
  $('#subtitle').textContent = 'Reto · esperando';
  const host = s.asientos.find(a => a.anfitrion);
  const op = s.opciones || {};
  $('#app').innerHTML = `
    <div class="sec" style="text-align:center"><div class="mut">Código del reto</div>
      <div class="on-code">${esc(s.codigo)}</div>
      <button class="btn-gold" id="onInvite" style="width:100%">📲 Enviar el código (WhatsApp…)</button>
      <div class="mut" style="margin-top:8px">Los demás abren Invasores espaciales → <b>Reto en línea</b> → <b>Unirse</b> y ponen el código.</div>
      <div class="mut" style="margin-top:6px">Dificultad: ${({ facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' })[op.nivel] || 'Normal'}</div></div>
    ${Publicas.aviso(s)}
    <div class="sec"><h2>Jugadores (${s.asientos.length}/${s.max})</h2>
      ${s.asientos.map(a => `<div class="on-seat"><span class="on-dot ${a.conectado ? 'ok' : ''}"></span><span class="n">${esc(a.nombre)}${a.id === s.yo ? ' <small>(tú)</small>' : ''}${a.anfitrion ? ' 👑' : ''}</span>
        ${s.anfitrion && a.id !== s.yo ? `<button class="btn-ghost sm" data-quitar="${a.id}" aria-label="Quitar">✕</button>` : ''}</div>`).join('')}</div>
    ${s.anfitrion
      ? `<button class="btn-gold" id="onStart" style="width:100%" ${s.asientos.length >= s.min ? '' : 'disabled'}>¡Empezar! 👾</button>
         <div class="mut" style="text-align:center;margin-top:6px">${s.asientos.length < s.min ? 'Espera a que entre alguien más.' : 'Cuando estéis todos, empezad: habrá una cuenta atrás de 3 segundos.'}</div>`
      : `<div class="sec" style="text-align:center">⏳ Esperando a que ${esc(host ? host.nombre : 'el anfitrión')} empiece…</div>`}
    <button class="btn-ghost" id="onLeave" style="width:100%;margin-top:12px">Salir</button>
    <div class="mut" id="onStatus" style="text-align:center;margin:10px 0 20px">${onEstadoHtml()}</div>`;
  $('#onInvite').onclick = () => onInvitar(s.codigo);
  const st = $('#onStart'); if (st) st.onclick = () => onEnviar({ t: 'empezar' });
  document.querySelectorAll('[data-quitar]').forEach(x => x.onclick = () => onEnviar({ t: 'quitar', asiento: x.dataset.quitar }));
  $('#onLeave').onclick = () => confirmBox('Salir', 'Saldrás de este reto.', 'Salir', () => onEnviar({ t: 'salir' }));
}
async function onInvitar(codigo) {
  const text = Invitacion.texto('👾', 'Invasores espaciales', codigo);
  try {
    if (isNative()) { await window.Capacitor.Plugins.Share.share({ title: 'Reto de Invasores espaciales', text, dialogTitle: 'Invitar' }); return; }
    if (navigator.share) { await navigator.share({ title: 'Reto de Invasores espaciales', text }); return; }
    await navigator.clipboard.writeText(text); toast('Invitación copiada');
  } catch (e) { if (!/cancel|abort/i.test(String(e && (e.message || e.name)))) toast('No se pudo compartir'); }
}
/* Clasificación en vivo */
function rankHtml(p) {
  const el = $('#ivRank'); if (!el) return;
  const orden = p.res.map((r, i) => i).sort((a, b) => p.res[b].puntos - p.res[a].puntos || a - b);
  el.innerHTML = orden.map((i, k) => `<div class="rk ${i === p.yo ? 'yo' : ''}"><span>${['🥇', '🥈', '🥉'][k] || (k + 1) + '.'} ${esc(i === p.yo ? 'Tú' : botName(p.nombres[i]))}${p.res[i].fin ? ' ✓' : ''}</span><b>${String(i === p.yo && RUN.g ? Math.max(RUN.g.puntos, p.res[i].puntos) : p.res[i].puntos).padStart(4, '0')}</b></div>`).join('');
}
function onRenderMesa(s) {
  const p = s.partida, ended = s.estado === 'fin';
  $('#subtitle').textContent = ended ? 'Reto · terminado' : 'Reto · ' + s.codigo;
  if (!ended) {
    const id = s.codigo + ':' + p.seed;
    if (ONG && ONG.id === id) { rankHtml(p); return; }
    ONG = { id };
    const mio = p.yo != null ? p.res[p.yo] : null;
    if (p.yo == null || (mio && (mio.fin || p.ahora - p.empezo > 8000))) {       // vuelves a un reto ya empezado: no se puede repetir
      if (mio && !mio.fin) onEnviar({ t: 'jugada', a: { tipo: 'fin', puntos: mio.puntos, oleada: mio.oleada } });
      stopLoop(); RUN.g = null;
      $('#app').innerHTML = '<div class="sec" style="text-align:center">' + (mio ? 'Tu partida de este reto ya ha terminado.' : 'Estás mirando el reto.') + '<br><span class="mut">⏳ Esperando a los demás…</span></div><div id="ivRank" class="iv-rank"></div>';
      rankHtml(p); return;
    }
    $('#app').innerHTML = gameHtml('<div id="ivRank" class="iv-rank"></div>');
    DEFAULTS();
    montarJuego(I.nueva({ seed: p.seed, nivel: p.nivel, auto: S.autofire }), 'online', p.nivel, 3000);
    rankHtml(p);
    return;
  }
  stopLoop(); RUN.g = null; ONG = null;
  archivarReto(s);
  const yaRev = (s.revancha || []).includes(s.yo);
  const medallas = ['🥇', '🥈', '🥉'];
  $('#app').innerHTML = `<div class="sec"><h2>🏁 Clasificación final</h2>
      ${p.orden.map((i, k) => `<div class="rk ${i === p.yo ? 'yo' : ''}"><span>${medallas[k] || (k + 1) + '.'} ${esc(i === p.yo ? 'Tú' : botName(p.nombres[i]))} <small class="mut">· oleada ${p.res[i].oleada}</small></span><b>${String(p.res[i].puntos).padStart(4, '0')}</b></div>`).join('')}
    </div>
    <div class="acts"><button class="btn-gold" id="onRe" style="flex:1" ${yaRev ? 'disabled' : ''}>${yaRev ? '⏳ Esperando a los demás' : '🔁 Revancha'}</button><button class="btn-ghost" id="onLeave2" style="flex:1">Salir</button></div>`;
  $('#onRe').onclick = () => onEnviar({ t: 'jugada', a: { tipo: 'revancha' } });
  $('#onLeave2').onclick = () => onEnviar({ t: 'salir' });
}
function leaveOnline() {
  const s = ON.sala;
  if (!s) return;
  if (s.estado === 'jugando') confirmBox('Abandonar el reto', 'Quedará tu puntuación hasta ahora y saldrás.', 'Abandonar', () => { stopLoop(); onEnviar({ t: 'salir' }); });
  else onEnviar({ t: 'salir' });
}
/* ---------- Invitación con enlace: entrar directamente en la sala ---------- */
function onUnirsePendiente(t0) {
  if (!ON.unirse) return;
  if (ON.estado === 'conectado' && ON.listo) { const c = ON.unirse; ON.unirse = null; onEnviar({ t: 'unirse', codigo: c, nombre: onNombre() }); return; }
  if (Date.now() - t0 > 20000) { ON.unirse = null; toast('Sin conexión con el servidor. Prueba otra vez en un momento.'); return; }
  setTimeout(() => onUnirsePendiente(t0), 300);
}
window.unirseDesdeEnlace = function (codigo) {
  const go = () => {
    S.draft.mode = 'online'; save();
    if (ON.sala && ON.sala.codigo === codigo) { render(); return; }
    S.online = S.online || {}; S.online.codigo = codigo; save();
    if (!onNombre()) {
      render();
      openModal(`<h3>🎟 Reto ${esc(codigo)}</h3><div class="sub">Te han invitado. Escribe tu nombre para entrar.</div>
        <input id="invName" maxlength="18" placeholder="Tu nombre" autocomplete="off" style="width:100%">
        <div class="acts"><button class="btn-ghost" id="invNo">Cancelar</button><button class="btn-gold" id="invOk">Entrar</button></div>`);
      const n = $('#invName'); setTimeout(() => n && n.focus(), 50);
      const ok = () => { const v = cleanName(n.value).slice(0, 18); if (!v) { toast('Escribe tu nombre'); n.focus(); return; } S.online.nombre = v; save(); closeModal(); go(); };
      $('#invOk').onclick = ok; n.onkeydown = e => { if (e.key === 'Enter') ok(); };
      $('#invNo').onclick = closeModal;
      return;
    }
    ON.unirse = codigo; onConectar(); render(); toast('Entrando en el reto ' + codigo + '…');
    onUnirsePendiente(Date.now());
  };
  if (ON.sala && ON.sala.codigo !== codigo && ON.sala.estado === 'jugando') { toast('Antes sal del reto en el que estás'); return; }
  if (S.game && S.game.g.fin) S.game = null;
  if (S.game) confirmBox('Reto en línea', 'Tienes una partida empezada en este móvil. Se abandonará y entrarás en el reto al que te invitan.', 'Entrar', () => { stopLoop(); S.game = null; go(); });
  else go();
};
setTimeout(() => { try { Invitacion.listo(); } catch (e) {} }, 0);

// Al abrir la app: si estabas en un reto en línea, vuelve a él
document.addEventListener('DOMContentLoaded', () => { try { if (S.online && S.online.enSala) onConectar(); } catch (e) {} });
