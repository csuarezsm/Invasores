# Invasores espaciales

El arcade de siempre para Android e iPhone: defiende la Tierra de la formación de invasores **en solitario** (3 dificultades) o en un **reto en línea** con amigos (la misma oleada para todos, gana quien más puntos consigue).
App Capacitor + web (`www/`). Todos los datos se guardan en el móvil; solo el reto en línea usa el servidor de juegos (nombre y puntos, sin guardarlos).
Paquete: `com.itcanarias.invasores` · versión 1.0.4

**iPhone y navegadores**: la misma app se publica como versión web instalable en https://csuarezsm.github.io/Invasores/app/ (GitHub Pages, carpeta `docs/app`, copia de `www/`). En Safari: Compartir → «Añadir a pantalla de inicio». Tras cambiar `www/`, ejecuta `npm run web`.

© 2026 IT Canarias. Todos los derechos reservados. App independiente: no está afiliada a Taito. Dibujos, sonidos y código propios; reglas inspiradas en el clásico de 1978.

Hecha con la misma plantilla que Ajedrez, Damas, Chinchón, Pumba, Parchís, Póker y UNO (tema por defecto: arcade, verde sobre negro). Las reglas, con sus fuentes, están en [REGLAS.md](REGLAS.md).

## Qué hace

- **Reglas del clásico** (55 invasores, escudos, platillo con tabla de premios, 3 vidas, vida extra a los 1500) y tres dificultades.
- **Controles**: arrastrar el dedo con disparo automático (por defecto), o botones ◀ ▶ y disparo manual; flechas y espacio en ordenador.
- **Reto en línea**: de 2 a 6 personas con el servidor común (`wss://juegos.itcanarias.com/ws`, repo `csuarezsm/juegos-servidor`, juego `invasores`). Crear reto y pasar el código por WhatsApp; retos públicos. La puntuación se calcula en cada móvil y el servidor solo comprueba que sea posible.
- Récords por dificultad, historial, copia de seguridad (exportar/importar, copia automática en Android), temas, tamaño de letra, sonidos sintetizados (sin archivos), aviso de turno, actualizador del APK, compartir la app, idiomas (ES, EN, FR, DE, IT) y borrar datos.

## Archivos

| Archivo | Contenido |
| --- | --- |
| `www/invasores.js` | Reglas y motor determinista (semilla): el **mismo archivo** va en el servidor (`juegos-servidor/motores/invasores/invasores.js`). Formación, bombas, escudos, platillo, puntos y una máquina que juega (para pruebas). |
| `www/juego.js` | Dibujo (píxel), sonidos, controles, partida clásica y cliente del reto en línea. |
| `www/index.html` | Estilos, menú, temas, historial, copia de seguridad, actualizador y arranque. |
| Archivos comunes | `idioma.js` + `i18n-*.js`, `masjuegos.js`, `turno.js`, `audio-suave.js`, `contador.js`, `invitacion.js`, `publicas.js`: idénticos en todas las apps. |
| `tests/motor.test.mjs` | Pruebas del motor: puntos por fila, tabla del platillo, vida extra, escudos, invasión, determinismo y partidas simuladas en los tres niveles. |
| `tests/app.test.mjs` | Pruebas de la interfaz (móvil, horizontal, tablet), controles, partida completa y récord, copia de seguridad, idiomas y reto en línea contra una copia local del servidor. |

## Desarrollo

```
npm ci
npm test            # motor + interfaz (necesita Chrome o Playwright; en línea usa ../juegos-servidor)
npm run web         # copia www/ a docs/app/
npm run icons       # genera los iconos de Android desde assets/
```
Ganchos de prueba (solo las pruebas los usan): `window.INV_TURBO = n` (n pasos por fotograma) y `window.INV_BOT = true` (juega la máquina).
Publicar: sube `versionCode`/`versionName` en `android/app/build.gradle`, `APP_VERSION` en `www/index.html`, `CACHE` en `www/sw.js` y `version` en `package.json`; `npm run web`; commit y push a `main`. El workflow compila, firma y crea la Release.
