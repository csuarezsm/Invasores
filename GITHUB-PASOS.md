# Qué tienes que hacer en GitHub (paso a paso)

Todo el trabajo está hecho y subido por mí. Solo faltan los pasos que necesitan tu cuenta. Cuenta de GitHub: `csuarezsm`. Repositorio de la app: **Invasores** (público).

## 0 · Crear el repositorio (si aún no existe)

1. GitHub → **New repository** → nombre **Invasores** → **Public** → sin README ni .gitignore.
2. Si ya lo he subido yo, salta al paso 1.

## 1 · Secretos de firma (una sola vez)

1. Repositorio **Invasores** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Crea dos secretos:
   - `ANDROID_KEYSTORE_BASE64` → pega todo el contenido del archivo `invasores-keystore-base64.txt` que te envío en el chat (una sola línea larga).
   - `ANDROID_KEYSTORE_PASSWORD` → la contraseña que te doy en el chat.
3. Guarda a salvo `invasores-release.jks` (alias `invasores`) y la contraseña: si se pierden no podrás actualizar la app instalada.
4. Cuando termines, borra el `.txt` de base64 del ordenador.

## 2 · GitHub Pages (iPhone, descarga y privacidad)

1. Repositorio **Invasores** → **Settings** → **Pages**.
2. *Source*: **Deploy from a branch** → Branch **main** → carpeta **/docs** → *Save*.
3. En 1–2 minutos funcionan https://csuarezsm.github.io/Invasores/ (descarga), https://csuarezsm.github.io/Invasores/app/ (app web para iPhone) y https://csuarezsm.github.io/Invasores/privacidad.html.

## 3 · Primera versión (APK)

1. Pestaña **Actions** → workflow *Android* → **Re-run all jobs** (la primera vez falla por falta de secretos).
2. Tarda 8–12 minutos: pasa las pruebas, compila, firma y crea la Release **v1.0.0**.
3. Pestaña **Releases**: deben estar `invasores.apk` e `invasores-play.aab`.
4. Android: abre https://csuarezsm.github.io/Invasores/ en **Chrome** → «Descargar para Android». iPhone: abre `…/Invasores/app/` en Safari → Compartir → «Añadir a pantalla de inicio».

## 4 · Servidor en línea (VPS)

El servidor ya tiene Invasores en GitHub (`juegos-servidor`, juego `invasores`). Para que «Reto en línea» funcione hay que actualizar el VPS **cuando tú lo decidas** (yo no lo he tocado):
`cd /opt/juegos-servidor && git pull && bash despliegue/instalar-vps.sh`
Sin eso, la app funciona en solitario y «Reto en línea» dirá que estará disponible muy pronto.

## 5 · Otras apps: ya incluyen Invasores en «Más juegos»

He actualizado Ajedrez, Damas, Pumba, Chinchón, Parchís, Póker y UNO (nueva versión patch de cada una). Cuando su workflow termine, publica la Release y las apps ya instaladas verán la actualización.
Recuerda además renombrar `poker` → `Poker` en GitHub (Settings → Repository name) para que su icono salga en «Más juegos».

## 6 · Google Play (opcional)

Usa `play-store/FICHA-GOOGLE-PLAY.md` y las imágenes de esa carpeta. Ojo: «Space Invaders» es marca de Taito y Play puede rechazar un nombre parecido; el documento explica la alternativa.
