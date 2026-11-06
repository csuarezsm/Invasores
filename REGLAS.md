# Reglas de Invasores espaciales

Juego arcade inspirado en el clásico de máquina recreativa de 1978. Dibujos, sonidos y código propios; reglas y puntuaciones del original, contrastadas en varias fuentes (al final). Estas reglas son también la especificación de `tests/motor.test.mjs`.

## Objetivo
Destruir a los **55 invasores** (5 filas de 11) antes de que lleguen abajo. Al limpiar la pantalla llega otra oleada, que empieza más baja y es más rápida.

## Tu cañón
- Se mueve de izquierda a derecha por el fondo y solo puede tener **un disparo en el aire** a la vez.
- **3 vidas.** Una bomba que te alcanza quita una vida. Ganas **una vida extra a los 1500 puntos** (una sola vez).
- Si los invasores llegan a tu altura, **la partida termina** aunque te queden vidas.

## Puntos
| Objetivo | Puntos |
| --- | --- |
| Fila de arriba (calamar) | 30 |
| Dos filas del medio (cangrejo) | 20 |
| Dos filas de abajo (pulpo) | 10 |
| Platillo | 50, 100, 150 o 300 |

El **platillo** cruza por arriba cada ~25 s mientras queden al menos 8 invasores. Su valor **no es al azar**: depende de cuántos disparos llevas (tabla de 15 valores: 50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100, 100).

## Los invasores
- Avanzan en bloque y bajan un escalón al tocar el borde. **Cuantos menos quedan, más rápido van.**
- Sueltan **bombas** (hasta tres a la vez); tu disparo puede destruirlas.
- Los **escudos** (4) se desgastan con tus disparos, con las bombas y con los invasores al pasar. Se reponen en cada oleada.

## Dificultad (decisión propia, el original no tenía niveles)
- **Fácil**: bombas más lentas y menos frecuentes, formación algo más lenta.
- **Normal**: el ritmo del clásico.
- **Difícil**: invasores más rápidos y bombardeo intenso.

## Controles (decisión propia)
Arrastrar el dedo por la pantalla con disparo automático (por defecto), o botones ◀ ▶ y disparo manual. En ordenador: flechas (o A/D) y barra espaciadora.

## Reto en línea (decisión propia)
De 2 a 6 amigos, cada uno en su móvil, juegan **la misma oleada a la vez** (la semilla la elige el servidor) y gana quien más puntos consigue. La puntuación la calcula cada móvil; el servidor solo comprueba que sea posible (tope de puntos por segundo y que no baje). Es un reto entre amigos, no una clasificación verificada. Sin máquinas; el reto se cierra solo a los 20 minutos.

## Variantes del original que no se incluyen
- Dos jugadores alternando en el mismo móvil (podría añadirse más adelante).
- Rarezas de la placa original (por ejemplo, el parpadeo del último invasor) y bonificaciones de versiones posteriores.
- Modo cooperativo.

## Fuentes
- StrategyWiki, «Space Invaders/Gameplay» (puntos por tipo de invasor, platillo de 50 a 300): https://strategywiki.org/wiki/Space_Invaders/Gameplay
- Shmups Wiki, «Space Invaders» (formación 11×5, tres cañones y vida extra a los 1500, platillo según el número de disparos): https://shmups.wiki/library/Space_Invaders
- Wikipedia, «Space Invaders» (contexto e historia, solo como apoyo): https://en.wikipedia.org/wiki/Space_Invaders
- Arcade History (arcade-history.com, ficha del juego) y Classic Gaming (classicgaming.cc, guía de juego): puntos por fila, tabla del platillo y frecuencia del platillo.
